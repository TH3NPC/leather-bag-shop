import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { formatETB } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { formatDate, formatDateTime } from "@/lib/time";
import { Card, PageHeader, PaymentBadge, Stat, StatusBadge } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await db.customer.findUnique({
    where: { id },
    include: { orders: { orderBy: { createdAt: "desc" }, select: { id: true, number: true, createdAt: true, totalCents: true, status: true, paymentStatus: true, _count: { select: { items: true } } } } },
  });
  if (!c) notFound();
  const completed = c.orders.filter((o) => o.status === "COMPLETED");

  return (
    <>
      <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink mb-4"><ArrowLeft size={15} /> Customers</Link>
      <PageHeader title={c.name} description={`Customer since ${formatDate(c.createdAt)}`} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Phone" value={<a href={`tel:${c.phone}`} className="text-[18px] hover:underline">{formatPhone(c.phone)}</a>} />
        <Stat label="Telegram" value={<span className="text-[18px]">{c.telegramUsername ? <a href={`https://t.me/${c.telegramUsername}`} target="_blank" rel="noreferrer" className="hover:underline">@{c.telegramUsername}</a> : c.telegramId ? "Linked" : "—"}</span>} note={c.telegramId ? "Verified by Telegram" : undefined} />
        <Stat label="Orders" value={c.orders.length} note={`${completed.length} completed`} />
        <Stat label="Completed purchases" value={formatETB(completed.reduce((n, o) => n + o.totalCents, 0))} />
      </div>
      <Card title="Order history">
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Order</th><th>Date</th><th className="num">Items</th><th className="num">Total</th><th>Payment</th><th>Status</th></tr></thead>
            <tbody>
              {c.orders.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/orders/${o.id}`} className="hover:underline">{o.number}</Link></td>
                  <td className="text-muted whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                  <td className="num">{o._count.items}</td>
                  <td className="num">{formatETB(o.totalCents)}</td>
                  <td><PaymentBadge status={o.paymentStatus} /></td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
