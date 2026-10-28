import "server-only";
import crypto from "node:crypto";
import { after } from "next/server";
import type { OrderStatus, PaymentKind, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/api";
import { formatETB } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { dayKey, startOfDay } from "@/lib/time";
import { FULFILLMENT_LABEL, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/labels";
import { escapeHtml, sendTelegramMessage, type TelegramUser } from "@/lib/telegram";
import { getSettings } from "./settings";

/*
 * STOCK POLICY
 * - Stock is reserved (subtracted) the moment a customer places an order, using a
 *   conditional UPDATE (stock >= qty). Two customers can never buy the last unit twice
 *   and stock can never go negative (also enforced by a database CHECK constraint).
 * - Cancelling an order returns its reserved stock exactly once (guarded by
 *   Order.stockReserved inside the same transaction).
 * - Other status changes never touch stock, so moving an order back and forth
 *   cannot deduct twice. Completed and cancelled orders are final.
 */

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "CANCELLED"],
  READY_FOR_PICKUP: ["COMPLETED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

/** Order statuses that count as a real sale (confirmed by the shop and not cancelled). */
export const SALE_STATUSES: OrderStatus[] = ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COMPLETED"];

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function randomCode(length: number) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

function newOrderNumber(now = new Date()) {
  // e.g. LB-261028-K7QX (date in Addis time + random suffix)
  return `LB-${dayKey(now).slice(2).replace(/-/g, "")}-${randomCode(4)}`;
}

export function computePaymentStatus(totalCents: number, paidCents: number, refundedCents: number): PaymentStatus {
  if (refundedCents > 0) return refundedCents >= paidCents ? "REFUNDED" : "PARTIALLY_REFUNDED";
  if (paidCents <= 0) return "UNPAID";
  return paidCents >= totalCents ? "PAID" : "PARTIALLY_PAID";
}

/** Amount still owed by the customer (refunds do not create a new balance). */
export const outstandingCents = (o: { totalCents: number; paidCents: number; status: OrderStatus }) =>
  o.status === "CANCELLED" ? 0 : Math.max(0, o.totalCents - o.paidCents);

export interface CheckoutInput {
  items: { productId: string; color: string | null; quantity: number }[];
  name: string;
  phone: string;
  fulfillment: "DELIVERY" | "PICKUP";
  address: string | null;
  landmark: string | null;
  notes: string | null;
  paymentMethod: string;
}

export async function createOrder(input: CheckoutInput, telegramUser: TelegramUser | null) {
  const settings = await getSettings();
  const paymentMethod = input.paymentMethod as PaymentMethod;
  if (!settings.paymentMethods.includes(paymentMethod)) {
    throw new AppError("This payment method is not available. Please choose another.", 422, { paymentMethod: "Not available" });
  }

  // Merge duplicate lines (same product and color).
  const merged = new Map<string, { productId: string; color: string | null; quantity: number }>();
  for (const item of input.items) {
    const key = `${item.productId}::${item.color ?? ""}`;
    const existing = merged.get(key);
    if (existing) existing.quantity += item.quantity;
    else merged.set(key, { ...item });
  }
  const lines = [...merged.values()];

  const order = await db.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: lines.map((l) => l.productId) } },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const itemsData: Prisma.OrderItemCreateWithoutOrderInput[] = [];
    const movements: { productId: string; change: number; stockAfter: number }[] = [];
    let subtotal = 0;

    for (const line of lines) {
      const product = byId.get(line.productId);
      if (!product || product.status !== "ACTIVE") {
        throw new AppError(`${product?.name ?? "A product in your cart"} is no longer available. Please remove it from your cart.`, 409);
      }
      if (product.colors.length > 0 && (!line.color || !product.colors.includes(line.color))) {
        throw new AppError(`Please choose an available color for ${product.name}.`, 422);
      }
      if (product.colors.length === 0) line.color = null;

      // Atomic reservation: only succeeds if enough stock remains at this instant.
      const reserved = await tx.product.updateMany({
        where: { id: product.id, status: "ACTIVE", stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (reserved.count === 0) {
        const fresh = await tx.product.findUnique({ where: { id: product.id }, select: { stock: true } });
        const left = fresh?.stock ?? 0;
        throw new AppError(
          left > 0
            ? `Only ${left} of ${product.name} left. Please reduce the quantity.`
            : `${product.name} just sold out. Please remove it from your cart.`,
          409,
        );
      }
      const after = await tx.product.findUniqueOrThrow({ where: { id: product.id }, select: { stock: true } });
      movements.push({ productId: product.id, change: -line.quantity, stockAfter: after.stock });

      // Server-side prices only. Client prices are never used.
      const lineTotal = product.priceCents * line.quantity;
      subtotal += lineTotal;
      itemsData.push({
        product: { connect: { id: product.id } },
        productName: product.name,
        sku: product.sku,
        color: line.color,
        imageUrl: product.images[0]?.url ?? null,
        unitPriceCents: product.priceCents,
        unitCostCents: product.costCents,
        quantity: line.quantity,
        lineTotalCents: lineTotal,
      });
    }

    const deliveryFee = input.fulfillment === "DELIVERY" ? settings.deliveryFeeCents : 0;

    // Customer: trusted Telegram identity first, otherwise match by phone.
    let customer;
    if (telegramUser) {
      customer = await tx.customer.upsert({
        where: { telegramId: telegramUser.id },
        update: { name: input.name, phone: input.phone, telegramUsername: telegramUser.username ?? null },
        create: { name: input.name, phone: input.phone, telegramId: telegramUser.id, telegramUsername: telegramUser.username ?? null },
      });
    } else {
      customer = await tx.customer.findFirst({ where: { phone: input.phone, telegramId: null }, orderBy: { createdAt: "asc" } });
      customer = customer
        ? await tx.customer.update({ where: { id: customer.id }, data: { name: input.name } })
        : await tx.customer.create({ data: { name: input.name, phone: input.phone } });
    }

    let number = newOrderNumber();
    while (await tx.order.findUnique({ where: { number }, select: { id: true } })) number = newOrderNumber();

    const created = await tx.order.create({
      data: {
        number,
        accessKey: crypto.randomBytes(16).toString("base64url"),
        customerId: customer.id,
        paymentMethod,
        fulfillment: input.fulfillment,
        customerName: input.name,
        phone: input.phone,
        address: input.fulfillment === "DELIVERY" ? input.address : null,
        landmark: input.fulfillment === "DELIVERY" ? input.landmark : null,
        notes: input.notes,
        subtotalCents: subtotal,
        deliveryFeeCents: deliveryFee,
        totalCents: subtotal + deliveryFee,
        stockReserved: true,
        items: { create: itemsData },
        statusEvents: { create: { to: "PENDING", note: "Order placed by customer" } },
      },
      include: { items: true },
    });

    await tx.inventoryMovement.createMany({
      data: movements.map((m) => ({ ...m, type: "ORDER_PLACED" as const, orderId: created.id, reason: `Order ${number}` })),
    });

    return created;
  });

  after(() => notifyAdminNewOrder(order.id));
  return order;
}

async function notifyAdminNewOrder(orderId: string) {
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!chatId) return;
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true, customer: true } });
  if (!order) return;
  const lines = order.items
    .map((i) => `• ${escapeHtml(i.productName)}${i.color ? ` (${escapeHtml(i.color)})` : ""} × ${i.quantity} — ${formatETB(i.lineTotalCents)}`)
    .join("\n");
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  const text = [
    `<b>New order ${order.number}</b>`,
    "",
    lines,
    "",
    `Total: <b>${formatETB(order.totalCents)}</b>${order.deliveryFeeCents ? ` (incl. delivery ${formatETB(order.deliveryFeeCents)})` : ""}`,
    `Payment: ${PAYMENT_METHOD_LABEL[order.paymentMethod]} — awaiting confirmation`,
    `${FULFILLMENT_LABEL[order.fulfillment]}${order.address ? `: ${escapeHtml(order.address)}` : ""}${order.landmark ? ` (near ${escapeHtml(order.landmark)})` : ""}`,
    "",
    `Customer: ${escapeHtml(order.customerName)}, ${formatPhone(order.phone)}${order.customer.telegramUsername ? `, @${escapeHtml(order.customer.telegramUsername)}` : ""}`,
    order.notes ? `Note: ${escapeHtml(order.notes)}` : "",
    appUrl ? `\n${appUrl}/admin/orders/${order.id}` : "",
  ].filter((l) => l !== "").join("\n");
  await sendTelegramMessage(chatId, text);
}

const CUSTOMER_STATUS_MESSAGE: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "has been confirmed",
  PREPARING: "is being prepared",
  READY_FOR_PICKUP: "is ready for pickup",
  OUT_FOR_DELIVERY: "is out for delivery",
  COMPLETED: "is complete. Thank you",
  CANCELLED: "has been cancelled",
};

export async function changeOrderStatus(orderId: string, to: OrderStatus, adminId: string, note: string | null) {
  const updated = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new AppError("Order not found.", 404);
    if (order.status === to) return order;
    if (!STATUS_TRANSITIONS[order.status].includes(to)) {
      throw new AppError(`An order that is ${ORDER_STATUS_LABEL[order.status].toLowerCase()} cannot be changed to ${ORDER_STATUS_LABEL[to].toLowerCase()}.`, 409);
    }
    if (to === "READY_FOR_PICKUP" && order.fulfillment !== "PICKUP") throw new AppError("This is a delivery order.", 409);
    if (to === "OUT_FOR_DELIVERY" && order.fulfillment !== "DELIVERY") throw new AppError("This is a pickup order.", 409);

    const now = new Date();
    const data: Prisma.OrderUpdateManyMutationInput = { status: to };
    if (to === "CONFIRMED") data.confirmedAt = now;
    if (to === "COMPLETED") data.completedAt = now;
    if (to === "CANCELLED") data.cancelledAt = now;

    const restock = to === "CANCELLED" && order.stockReserved;
    if (restock) data.stockReserved = false;

    // Optimistic concurrency: fails if someone else changed the order meanwhile.
    const res = await tx.order.updateMany({ where: { id: orderId, status: order.status, stockReserved: order.stockReserved }, data });
    if (res.count === 0) throw new AppError("This order was just updated by someone else. Please reload.", 409);

    if (restock) {
      for (const item of order.items) {
        if (!item.productId) continue;
        const p = await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } }, select: { stock: true } });
        await tx.inventoryMovement.create({
          data: { productId: item.productId, type: "ORDER_CANCELLED", change: item.quantity, stockAfter: p.stock, orderId, adminId, reason: `Order ${order.number} cancelled` },
        });
      }
    }

    await tx.orderStatusEvent.create({ data: { orderId, from: order.status, to, note, adminId } });
    return tx.order.findUniqueOrThrow({ where: { id: orderId } });
  });

  after(async () => {
    const msg = CUSTOMER_STATUS_MESSAGE[to];
    const order = await db.order.findUnique({ where: { id: orderId }, include: { customer: true } });
    // A bot can only message users who have started it; failures are logged and ignored.
    if (msg && order?.customer.telegramId) {
      await sendTelegramMessage(order.customer.telegramId, `Your order <b>${order.number}</b> ${msg}.`);
    }
  });

  return updated;
}

export interface PaymentInput {
  kind: PaymentKind;
  method: PaymentMethod;
  amountCents: number;
  reference: string | null;
  note: string | null;
  receivedAt?: string;
}

/** Records a verified manual payment or refund and updates the order's running totals. */
export async function recordPayment(orderId: string, input: PaymentInput, adminId: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError("Order not found.", 404);

    let paid = order.paidCents;
    let refunded = order.refundedCents;
    if (input.kind === "PAYMENT") {
      if (order.status === "CANCELLED") throw new AppError("Cannot record a payment on a cancelled order.", 409);
      const due = order.totalCents - order.paidCents;
      if (due <= 0) throw new AppError("This order is already fully paid.", 409);
      if (input.amountCents > due) throw new AppError(`Amount is more than the balance due (${formatETB(due)}).`, 422, { amount: "Too high" });
      paid += input.amountCents;
    } else {
      const refundable = order.paidCents - order.refundedCents;
      if (refundable <= 0) throw new AppError("There is no paid amount to refund.", 409);
      if (input.amountCents > refundable) throw new AppError(`Refund is more than the amount paid (${formatETB(refundable)}).`, 422, { amount: "Too high" });
      refunded += input.amountCents;
    }

    const res = await tx.order.updateMany({
      where: { id: orderId, paidCents: order.paidCents, refundedCents: order.refundedCents },
      data: { paidCents: paid, refundedCents: refunded, paymentStatus: computePaymentStatus(order.totalCents, paid, refunded) },
    });
    if (res.count === 0) throw new AppError("This order was just updated by someone else. Please reload.", 409);

    // Payment date in Addis time; "today" keeps the current time for ordering.
    const receivedAt = input.receivedAt && input.receivedAt !== dayKey(new Date())
      ? new Date(startOfDay(input.receivedAt).getTime() + 12 * 60 * 60 * 1000)
      : new Date();
    if (receivedAt.getTime() > Date.now() + 60_000) throw new AppError("Payment date cannot be in the future.", 422, { receivedAt: "In the future" });

    return tx.payment.create({
      data: {
        orderId,
        kind: input.kind,
        method: input.method,
        amountCents: input.amountCents,
        reference: input.reference,
        note: input.note,
        receivedAt,
        recordedById: adminId,
      },
    });
  });
}
