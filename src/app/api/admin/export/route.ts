import type { OrderStatus, PaymentMethod, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { adminRoute } from "@/lib/api";
import { centsToInput } from "@/lib/money";
import { addDays, dayKey, formatDateTime, isValidDayKey, resolveRange, startOfDay } from "@/lib/time";
import { ORDER_STATUS_LABEL, ORDER_STATUSES, PAYMENT_METHOD_LABEL, PAYMENT_METHODS, PAYMENT_STATUS_LABEL } from "@/lib/labels";
import { SALE_STATUSES } from "@/server/orders";

/** Quotes a CSV cell and neutralises spreadsheet formulas (=, +, -, @). */
function cell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(filename: string, header: string[], rows: unknown[][]) {
  // BOM so Excel opens UTF-8 (Amharic names) correctly.
  const body = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export const GET = adminRoute(async (req, _ctx, admin) => {
  const url = new URL(req.url);
  const p = url.searchParams;
  const type = p.get("type");
  const owner = admin.role === "OWNER";

  if (type === "inventory") {
    const products = await db.product.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { name: "asc" },
      include: { category: { select: { name: true } } },
    });
    const sold = await db.orderItem.groupBy({ by: ["productId"], where: { order: { status: { in: SALE_STATUSES } } }, _sum: { quantity: true } });
    const soldMap = new Map(sold.map((s) => [s.productId, s._sum.quantity ?? 0]));
    return csv(`inventory-${dayKey(new Date())}.csv`,
      ["Product", "SKU", "Category", "Status", "Price (ETB)", ...(owner ? ["Cost (ETB)"] : []), "In stock", "Low-stock alert", "Units sold"],
      products.map((x) => [x.name, x.sku, x.category.name, x.status, centsToInput(x.priceCents), ...(owner ? [centsToInput(x.costCents)] : []), x.stock, x.lowStockThreshold, soldMap.get(x.id) ?? 0]),
    );
  }

  if (type === "sales") {
    const range = resolveRange(p.get("period") ?? "month", p.get("from") ?? undefined, p.get("to") ?? undefined);
    const items = await db.orderItem.findMany({
      where: { order: { status: { in: SALE_STATUSES }, createdAt: { gte: range.gte, lt: range.lt } } },
      include: { order: { select: { number: true, createdAt: true, status: true, paymentMethod: true, paymentStatus: true, customerName: true } } },
      orderBy: { order: { createdAt: "asc" } },
    });
    return csv(`sales-${range.from}-to-${range.to}.csv`,
      ["Date", "Order", "Customer", "Status", "Payment method", "Payment status", "Product", "SKU", "Color", "Qty", "Unit price (ETB)", "Line total (ETB)", ...(owner ? ["Unit cost (ETB)", "Line gross profit (ETB)"] : [])],
      items.map((i) => [
        formatDateTime(i.order.createdAt), i.order.number, i.order.customerName, ORDER_STATUS_LABEL[i.order.status],
        PAYMENT_METHOD_LABEL[i.order.paymentMethod], PAYMENT_STATUS_LABEL[i.order.paymentStatus],
        i.productName, i.sku, i.color, i.quantity, centsToInput(i.unitPriceCents), centsToInput(i.lineTotalCents),
        ...(owner ? [centsToInput(i.unitCostCents), i.unitCostCents === null ? "" : centsToInput(i.lineTotalCents - i.unitCostCents * i.quantity)] : []),
      ]),
    );
  }

  if (type === "orders") {
    const status = ORDER_STATUSES.find((s) => s === p.get("status")) as OrderStatus | undefined;
    const method = PAYMENT_METHODS.find((m) => m === p.get("method")) as PaymentMethod | undefined;
    const from = p.get("from"), to = p.get("to"), q = p.get("q")?.trim();
    const where: Prisma.OrderWhereInput = {
      ...(status ? { status } : {}),
      ...(method ? { paymentMethod: method } : {}),
      ...(isValidDayKey(from) || isValidDayKey(to)
        ? { createdAt: { ...(isValidDayKey(from) ? { gte: startOfDay(from) } : {}), ...(isValidDayKey(to) ? { lt: startOfDay(addDays(to, 1)) } : {}) } }
        : {}),
      ...(q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { customerName: { contains: q, mode: "insensitive" } }] } : {}),
    };
    const orders = await db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 5000, include: { items: { select: { productName: true, quantity: true } } } });
    return csv(`orders-${dayKey(new Date())}.csv`,
      ["Date", "Order", "Customer", "Phone", "Fulfillment", "Items", "Subtotal (ETB)", "Delivery (ETB)", "Total (ETB)", "Paid (ETB)", "Refunded (ETB)", "Payment method", "Payment status", "Status"],
      orders.map((o) => [
        formatDateTime(o.createdAt), o.number, o.customerName, o.phone, o.fulfillment, o.items.map((i) => `${i.productName} x${i.quantity}`).join("; "),
        centsToInput(o.subtotalCents), centsToInput(o.deliveryFeeCents), centsToInput(o.totalCents), centsToInput(o.paidCents), centsToInput(o.refundedCents),
        PAYMENT_METHOD_LABEL[o.paymentMethod], PAYMENT_STATUS_LABEL[o.paymentStatus], ORDER_STATUS_LABEL[o.status],
      ]),
    );
  }

  return new Response("Unknown export type", { status: 400 });
});
