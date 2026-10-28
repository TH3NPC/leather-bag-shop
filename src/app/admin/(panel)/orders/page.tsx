import Link from "next/link";
import type { Metadata } from "next";
import type { OrderStatus, PaymentMethod, Prisma } from "@prisma/client";
import { Download } from "lucide-react";
import { db } from "@/lib/db";
import { formatETB } from "@/lib/money";
import { formatDateTime, isValidDayKey, startOfDay, addDays } from "@/lib/time";
import { ORDER_STATUS_LABEL, ORDER_STATUSES, PAYMENT_METHOD_LABEL, PAYMENT_METHODS } from "@/lib/labels";
import { Card, Empty, PageHeader, PaymentBadge, StatusBadge } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/Pagination";

export const metadata: Metadata = { title: "Orders" };
const PAGE_SIZE = 25;

type Search = Promise<{ q?: string; status?: string; method?: string; from?: string; to?: string; page?: string }>;

export default async function OrdersPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const status = ORDER_STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const method = PAYMENT_METHODS.includes(sp.method as PaymentMethod) ? (sp.method as PaymentMethod) : undefined;
  const from = isValidDayKey(sp.from) ? sp.from : undefined;
  const to = isValidDayKey(sp.to) ? sp.to : undefined;

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(method ? { paymentMethod: method } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: startOfDay(from) } : {}), ...(to ? { lt: startOfDay(addDays(to, 1)) } : {}) } } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { customerName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q.replace(/\s/g, "").replace(/^0/, "") } },
          ],
        }
      : {}),
  };

  const total = await db.order.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(sp.page) || 1), pageCount);
  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true, number: true, customerName: true, createdAt: true, totalCents: true, status: true, paymentStatus: true, paymentMethod: true,
      items: { select: { productName: true, quantity: true } },
    },
  });

  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, status, method, from, to, ...extra })) if (v) p.set(k, v);
    return p.toString();
  };

  return (
    <>
      <PageHeader
        title="Orders"
        actions={<a href={`/api/admin/export?type=orders&${qs({})}`} className="btn btn-outline btn-sm"><Download size={15} /> Export CSV</a>}
      />

      <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto_auto_auto] mb-5" method="get">
        <input name="q" defaultValue={q} placeholder="Order number, name or phone" className="field h-10 text-[14px]" />
        <select name="status" defaultValue={status ?? ""} className="field h-10 text-[14px]">
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
        </select>
        <select name="method" defaultValue={method ?? ""} className="field h-10 text-[14px]">
          <option value="">All payment methods</option>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
        </select>
        <input type="date" name="from" defaultValue={from} className="field h-10 text-[14px]" aria-label="From date" />
        <input type="date" name="to" defaultValue={to} className="field h-10 text-[14px]" aria-label="To date" />
        <div className="flex gap-2">
          <button className="btn btn-primary btn-sm h-10">Filter</button>
          <Link href="/admin/orders" className="btn btn-ghost btn-sm h-10">Reset</Link>
        </div>
      </form>

      <Card>
        {orders.length === 0 ? (
          <Empty title="No orders found" text={q || status || method || from ? "Try different filters." : "Orders placed in the shop will appear here."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th className="num">Total</th><th>Payment</th><th>Status</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="whitespace-nowrap"><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline tracking-[0.02em]">{o.number}</Link></td>
                    <td className="whitespace-nowrap">{o.customerName}</td>
                    <td className="whitespace-nowrap text-muted">{formatDateTime(o.createdAt)}</td>
                    <td className="min-w-[180px] text-charcoal">{o.items.map((i) => `${i.productName} × ${i.quantity}`).join(", ")}</td>
                    <td className="num">{formatETB(o.totalCents)}</td>
                    <td><PaymentBadge status={o.paymentStatus} /><p className="text-[12px] text-muted mt-1 whitespace-nowrap">{PAYMENT_METHOD_LABEL[o.paymentMethod]}</p></td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-3 text-[12px] text-muted">{total} {total === 1 ? "order" : "orders"}</p>
      <Pagination page={page} pageCount={pageCount} hrefFor={(p) => `/admin/orders?${qs({ page: String(p) })}`} />
    </>
  );
}
