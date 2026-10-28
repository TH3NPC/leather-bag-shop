import "server-only";
import type { ExpenseCategory, OrderStatus, PaymentMethod } from "@prisma/client";
import { db } from "@/lib/db";
import { addDays, dayKey, daysInRange, type DateRange } from "@/lib/time";
import { SALE_STATUSES } from "./orders";

/*
 * DEFINITIONS (shown to the owner on the dashboard and reports)
 * - Sales (order value): totals of orders placed in the period that the shop has
 *   confirmed and not cancelled. Pending (unconfirmed) and cancelled orders are excluded.
 * - Collected: verified payments recorded in the period (by payment date) minus refunds.
 *   This is cash actually received. Unverified/pending payments are never counted.
 * - Outstanding: confirmed, not-cancelled orders whose payments do not yet cover the total.
 * - Gross profit (estimate): product revenue minus cost price, only for items whose
 *   cost price was known when the order was placed. Items without cost are excluded and counted.
 * - Net operating profit (estimate): gross profit + delivery fees − refunds − expenses.
 */

type ItemRow = { productId: string | null; productName: string; quantity: number; lineTotalCents: number; unitCostCents: number | null };
type OrderRow = {
  id: string;
  status: OrderStatus;
  totalCents: number;
  subtotalCents: number;
  deliveryFeeCents: number;
  paidCents: number;
  createdAt: Date;
  paymentMethod: PaymentMethod;
  items: ItemRow[];
};

async function loadOrders(range: DateRange) {
  return db.order.findMany({
    where: { createdAt: { gte: range.gte, lt: range.lt } },
    select: {
      id: true, status: true, totalCents: true, subtotalCents: true, deliveryFeeCents: true, paidCents: true,
      createdAt: true, paymentMethod: true,
      items: { select: { productId: true, productName: true, quantity: true, lineTotalCents: true, unitCostCents: true } },
    },
  }) as Promise<OrderRow[]>;
}

async function loadPayments(range: DateRange) {
  return db.payment.findMany({
    where: { receivedAt: { gte: range.gte, lt: range.lt } },
    select: { kind: true, method: true, amountCents: true, receivedAt: true },
  });
}

async function loadExpenses(range: DateRange) {
  return db.expense.findMany({
    where: { date: { gte: range.gte, lt: range.lt } },
    select: { category: true, amountCents: true, date: true },
  });
}

const isSale = (o: { status: OrderStatus }) => SALE_STATUSES.includes(o.status);

export interface Summary {
  salesCents: number;
  saleOrders: number;
  averageOrderCents: number;
  unitsSold: number;
  deliveryFeesCents: number;
  collectedCents: number;
  refundsCents: number;
  netCollectedCents: number;
  pendingOrders: number;
  pendingValueCents: number;
  completedOrders: number;
  cancelledOrders: number;
  productRevenueCents: number;
  costedRevenueCents: number;
  costOfGoodsCents: number;
  grossProfitCents: number;
  itemsWithoutCost: number;
  totalItemLines: number;
  expensesCents: number;
  netProfitCents: number;
}

function summarize(orders: OrderRow[], payments: Awaited<ReturnType<typeof loadPayments>>, expenses: Awaited<ReturnType<typeof loadExpenses>>): Summary {
  const sales = orders.filter(isSale);
  const salesCents = sum(sales.map((o) => o.totalCents));
  const items = sales.flatMap((o) => o.items);
  const costed = items.filter((i) => i.unitCostCents !== null);
  const costedRevenueCents = sum(costed.map((i) => i.lineTotalCents));
  const costOfGoodsCents = sum(costed.map((i) => (i.unitCostCents ?? 0) * i.quantity));
  const grossProfitCents = costedRevenueCents - costOfGoodsCents;
  const collectedCents = sum(payments.filter((p) => p.kind === "PAYMENT").map((p) => p.amountCents));
  const refundsCents = sum(payments.filter((p) => p.kind === "REFUND").map((p) => p.amountCents));
  const deliveryFeesCents = sum(sales.map((o) => o.deliveryFeeCents));
  const expensesCents = sum(expenses.map((e) => e.amountCents));
  const pending = orders.filter((o) => o.status === "PENDING");

  return {
    salesCents,
    saleOrders: sales.length,
    averageOrderCents: sales.length ? Math.round(salesCents / sales.length) : 0,
    unitsSold: sum(items.map((i) => i.quantity)),
    deliveryFeesCents,
    collectedCents,
    refundsCents,
    netCollectedCents: collectedCents - refundsCents,
    pendingOrders: pending.length,
    pendingValueCents: sum(pending.map((o) => o.totalCents)),
    completedOrders: orders.filter((o) => o.status === "COMPLETED").length,
    cancelledOrders: orders.filter((o) => o.status === "CANCELLED").length,
    productRevenueCents: sum(items.map((i) => i.lineTotalCents)),
    costedRevenueCents,
    costOfGoodsCents,
    grossProfitCents,
    itemsWithoutCost: items.length - costed.length,
    totalItemLines: items.length,
    expensesCents,
    netProfitCents: grossProfitCents + deliveryFeesCents - refundsCents - expensesCents,
  };
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export interface SeriesPoint { key: string; label: string; salesCents: number; collectedCents: number; orders: number }

/** Daily buckets for ranges up to 62 days, monthly beyond that. */
function buildSeries(range: DateRange, orders: OrderRow[], payments: Awaited<ReturnType<typeof loadPayments>>): SeriesPoint[] {
  const days = daysInRange(range);
  const monthly = days.length > 62;
  const bucketOf = (key: string) => (monthly ? key.slice(0, 7) : key);
  const keys = [...new Set(days.map(bucketOf))];
  const map = new Map<string, SeriesPoint>(
    keys.map((k) => [k, { key: k, label: formatBucket(k, monthly), salesCents: 0, collectedCents: 0, orders: 0 }]),
  );
  for (const o of orders) {
    if (!isSale(o)) continue;
    const p = map.get(bucketOf(dayKey(o.createdAt)));
    if (p) { p.salesCents += o.totalCents; p.orders += 1; }
  }
  for (const pay of payments) {
    const p = map.get(bucketOf(dayKey(pay.receivedAt)));
    if (p) p.collectedCents += pay.kind === "PAYMENT" ? pay.amountCents : -pay.amountCents;
  }
  return [...map.values()];
}

const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
function formatBucket(key: string, monthly: boolean) {
  return monthly ? monthFmt.format(new Date(`${key}-01T00:00:00Z`)) : dayFmt.format(new Date(`${key}T00:00:00Z`));
}

function bestSellers(orders: OrderRow[], limit = 5) {
  const map = new Map<string, { name: string; productId: string | null; units: number; revenueCents: number }>();
  for (const o of orders.filter(isSale)) {
    for (const i of o.items) {
      const key = i.productId ?? `deleted:${i.productName}`;
      const row = map.get(key) ?? { name: i.productName, productId: i.productId, units: 0, revenueCents: 0 };
      row.units += i.quantity;
      row.revenueCents += i.lineTotalCents;
      map.set(key, row);
    }
  }
  return [...map.values()].sort((a, b) => b.units - a.units || b.revenueCents - a.revenueCents).slice(0, limit);
}

export async function getLowStock(limit = 8) {
  // Compares each product's stock against its own threshold.
  const rows = await db.$queryRaw<{ id: string; name: string; stock: number; lowStockThreshold: number }[]>`
    SELECT id, name, stock, "lowStockThreshold" FROM "Product"
    WHERE status <> 'ARCHIVED' AND stock <= "lowStockThreshold"
    ORDER BY stock ASC, name ASC LIMIT ${limit}`;
  return rows;
}

export async function getOutstanding() {
  const rows = await db.order.findMany({
    where: { status: { in: SALE_STATUSES } },
    select: { totalCents: true, paidCents: true },
  });
  const open = rows.filter((r) => r.paidCents < r.totalCents);
  return { orders: open.length, amountCents: sum(open.map((r) => r.totalCents - r.paidCents)) };
}

export async function getDashboard(range: DateRange) {
  const today = dayKey(new Date());
  const [orders, payments, expenses, lowStock, outstanding, pendingAll] = await Promise.all([
    loadOrders(range),
    loadPayments(range),
    loadExpenses(range),
    getLowStock(),
    getOutstanding(),
    db.order.count({ where: { status: "PENDING" } }),
  ]);
  return {
    summary: summarize(orders, payments, expenses),
    series: buildSeries(range, orders, payments),
    bestSellers: bestSellers(orders),
    lowStock,
    outstanding,
    pendingAll,
    today,
  };
}

/** Today and this month at a glance, independent of the selected period. */
export async function getSnapshot(todayRange: DateRange, monthRange: DateRange) {
  const [tOrders, tPayments, mOrders, mPayments] = await Promise.all([
    loadOrders(todayRange), loadPayments(todayRange), loadOrders(monthRange), loadPayments(monthRange),
  ]);
  const t = summarize(tOrders, tPayments, []);
  const m = summarize(mOrders, mPayments, []);
  return {
    today: { salesCents: t.salesCents, orders: tOrders.filter((o) => o.status !== "CANCELLED").length, collectedCents: t.netCollectedCents },
    month: { salesCents: m.salesCents, orders: mOrders.filter((o) => o.status !== "CANCELLED").length, collectedCents: m.netCollectedCents },
  };
}

export async function getReport(range: DateRange) {
  const [orders, payments, expenses] = await Promise.all([loadOrders(range), loadPayments(range), loadExpenses(range)]);
  const summary = summarize(orders, payments, expenses);
  const sales = orders.filter(isSale);

  // Sales by product and category (category is the product's current category).
  const productIds = [...new Set(sales.flatMap((o) => o.items.map((i) => i.productId)).filter(Boolean))] as string[];
  const products = await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, category: { select: { name: true } } } });
  const categoryOf = new Map(products.map((p) => [p.id, p.category.name]));

  const byProduct = new Map<string, { name: string; category: string; units: number; revenueCents: number; costCents: number | null }>();
  const byCategory = new Map<string, { name: string; units: number; revenueCents: number }>();
  for (const o of sales) {
    for (const i of o.items) {
      const category = (i.productId && categoryOf.get(i.productId)) || "Uncategorized";
      const key = i.productId ?? `deleted:${i.productName}`;
      const p = byProduct.get(key) ?? { name: i.productName, category, units: 0, revenueCents: 0, costCents: 0 };
      p.units += i.quantity;
      p.revenueCents += i.lineTotalCents;
      p.costCents = p.costCents === null || i.unitCostCents === null ? null : p.costCents + i.unitCostCents * i.quantity;
      byProduct.set(key, p);
      const c = byCategory.get(category) ?? { name: category, units: 0, revenueCents: 0 };
      c.units += i.quantity;
      c.revenueCents += i.lineTotalCents;
      byCategory.set(category, c);
    }
  }

  const byMethod = new Map<PaymentMethod, { method: PaymentMethod; collectedCents: number; refundsCents: number; count: number }>();
  for (const p of payments) {
    const row = byMethod.get(p.method) ?? { method: p.method, collectedCents: 0, refundsCents: 0, count: 0 };
    if (p.kind === "PAYMENT") { row.collectedCents += p.amountCents; row.count += 1; } else row.refundsCents += p.amountCents;
    byMethod.set(p.method, row);
  }

  const byExpense = new Map<ExpenseCategory, number>();
  for (const e of expenses) byExpense.set(e.category, (byExpense.get(e.category) ?? 0) + e.amountCents);

  // Period tables: day, ISO-like week (starting Monday), month.
  const periodTable = (bucket: (key: string) => string) => {
    const map = new Map<string, { key: string; orders: number; units: number; salesCents: number; collectedCents: number }>();
    const get = (k: string) => map.get(k) ?? map.set(k, { key: k, orders: 0, units: 0, salesCents: 0, collectedCents: 0 }).get(k)!;
    for (const o of sales) {
      const row = get(bucket(dayKey(o.createdAt)));
      row.orders += 1;
      row.units += sum(o.items.map((i) => i.quantity));
      row.salesCents += o.totalCents;
    }
    for (const p of payments) get(bucket(dayKey(p.receivedAt))).collectedCents += p.kind === "PAYMENT" ? p.amountCents : -p.amountCents;
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  };
  const weekStart = (key: string) => {
    const dow = (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
    return addDays(key, -dow);
  };

  return {
    summary,
    byProduct: [...byProduct.values()].sort((a, b) => b.revenueCents - a.revenueCents),
    byCategory: [...byCategory.values()].sort((a, b) => b.revenueCents - a.revenueCents),
    byMethod: [...byMethod.values()].sort((a, b) => b.collectedCents - a.collectedCents),
    byExpense: [...byExpense.entries()].map(([category, amountCents]) => ({ category, amountCents })).sort((a, b) => b.amountCents - a.amountCents),
    daily: periodTable((k) => k),
    weekly: periodTable(weekStart),
    monthly: periodTable((k) => k.slice(0, 7)),
  };
}
