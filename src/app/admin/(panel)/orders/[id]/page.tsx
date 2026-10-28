import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Printer } from "lucide-react";
import { db } from "@/lib/db";
import { formatETB } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { formatDateTime } from "@/lib/time";
import { FULFILLMENT_LABEL, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/labels";
import { STATUS_TRANSITIONS } from "@/server/orders";
import { Card, PaymentBadge, StatusBadge } from "@/components/admin/ui";
import { OrderActions } from "@/components/admin/OrderActions";

export const metadata: Metadata = { title: "Order" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      customer: { select: { id: true, telegramUsername: true, telegramId: true } },
      payments: { orderBy: { receivedAt: "asc" }, include: { recordedBy: { select: { name: true } } } },
      statusEvents: { orderBy: { createdAt: "asc" }, include: { admin: { select: { name: true } } } },
    },
  });
  if (!order) notFound();

  const due = order.status === "CANCELLED" ? 0 : Math.max(0, order.totalCents - order.paidCents);
  const refundable = order.paidCents - order.refundedCents;
  const next = STATUS_TRANSITIONS[order.status].filter(
    (s) => !(s === "READY_FOR_PICKUP" && order.fulfillment !== "PICKUP") && !(s === "OUT_FOR_DELIVERY" && order.fulfillment !== "DELIVERY"),
  );

  return (
    <>
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink mb-4"><ArrowLeft size={15} /> Orders</Link>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="display text-[32px] md:text-[40px] tracking-[0.01em]">{order.number}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted">
            <StatusBadge status={order.status} />
            <PaymentBadge status={order.paymentStatus} />
            <span>Placed {formatDateTime(order.createdAt)}</span>
          </div>
        </div>
        <Link href={`/admin/orders/${order.id}/receipt`} target="_blank" className="btn btn-outline btn-sm"><Printer size={15} /> Receipt</Link>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="space-y-6">
          <Card title="Items">
            <ul className="divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex gap-4 px-5 py-4 text-[14px]">
                  <div className="relative w-12 aspect-[4/5] bg-sand shrink-0">
                    {i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="48px" className="object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p>{i.productId ? <Link href={`/admin/products/${i.productId}`} className="hover:underline">{i.productName}</Link> : i.productName}</p>
                    <p className="text-[12px] text-muted">{[i.color, i.sku].filter(Boolean).join(" · ")}</p>
                  </div>
                  <p className="text-muted tabular-nums whitespace-nowrap">{i.quantity} × {formatETB(i.unitPriceCents)}</p>
                  <p className="tabular-nums w-24 text-right">{formatETB(i.lineTotalCents)}</p>
                </li>
              ))}
            </ul>
            <dl className="px-5 py-4 border-t border-line text-[14px] space-y-1.5">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatETB(order.subtotalCents)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd className="tabular-nums">{formatETB(order.deliveryFeeCents)}</dd></div>
              <div className="flex justify-between font-medium pt-1"><dt>Total</dt><dd className="tabular-nums">{formatETB(order.totalCents)}</dd></div>
              <div className="flex justify-between text-success"><dt>Paid (verified)</dt><dd className="tabular-nums">{formatETB(order.paidCents)}</dd></div>
              {order.refundedCents > 0 && <div className="flex justify-between text-danger"><dt>Refunded</dt><dd className="tabular-nums">−{formatETB(order.refundedCents)}</dd></div>}
              <div className={`flex justify-between ${due ? "text-warning" : "text-muted"}`}><dt>Balance due</dt><dd className="tabular-nums">{formatETB(due)}</dd></div>
            </dl>
            <p className="px-5 pb-4 text-[12px] text-muted">Prices are saved with the order and do not change when product prices are edited.</p>
          </Card>

          <Card title="Payments">
            {order.payments.length === 0 ? (
              <p className="px-5 py-4 text-[13px] text-muted">No payment recorded. Record a payment only after you have verified the money was received.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Date</th><th>Type</th><th>Method</th><th>Reference</th><th className="num">Amount</th></tr></thead>
                  <tbody>
                    {order.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="whitespace-nowrap text-muted">{formatDateTime(p.receivedAt)}<p className="text-[11px]">by {p.recordedBy?.name ?? "—"}</p></td>
                        <td>{p.kind === "PAYMENT" ? "Payment" : <span className="text-danger">Refund</span>}</td>
                        <td>{PAYMENT_METHOD_LABEL[p.method]}</td>
                        <td className="text-muted">{p.reference ?? "—"}{p.note && <p className="text-[12px]">{p.note}</p>}</td>
                        <td className={`num ${p.kind === "REFUND" ? "text-danger" : ""}`}>{p.kind === "REFUND" ? "−" : ""}{formatETB(p.amountCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="History">
            <ol className="px-5 py-4 space-y-3 text-[13px]">
              {order.statusEvents.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="text-muted whitespace-nowrap w-40 shrink-0">{formatDateTime(e.createdAt)}</span>
                  <span>
                    {e.from ? `${ORDER_STATUS_LABEL[e.from]} → ` : ""}<strong className="font-medium">{ORDER_STATUS_LABEL[e.to]}</strong>
                    <span className="text-muted"> · {e.admin?.name ?? "Customer"}</span>
                    {e.note && <span className="block text-muted">{e.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <OrderActions
            orderId={order.id}
            nextStatuses={next}
            paymentMethod={order.paymentMethod}
            dueCents={due}
            refundableCents={refundable}
            cancelled={order.status === "CANCELLED"}
          />

          <Card title="Customer">
            <div className="px-5 py-4 text-[14px] space-y-1">
              <p><Link href={`/admin/customers/${order.customer.id}`} className="hover:underline">{order.customerName}</Link></p>
              <p><a href={`tel:${order.phone}`} className="hover:underline">{formatPhone(order.phone)}</a></p>
              {order.customer.telegramUsername && (
                <p><a href={`https://t.me/${order.customer.telegramUsername}`} target="_blank" rel="noreferrer" className="hover:underline">@{order.customer.telegramUsername}</a> <span className="text-[12px] text-muted">(verified Telegram)</span></p>
              )}
              {!order.customer.telegramUsername && order.customer.telegramId && <p className="text-[12px] text-muted">Verified Telegram user</p>}
            </div>
          </Card>

          <Card title={FULFILLMENT_LABEL[order.fulfillment]}>
            <div className="px-5 py-4 text-[14px] space-y-1">
              {order.fulfillment === "DELIVERY" ? (
                <>
                  <p className="whitespace-pre-line">{order.address}</p>
                  {order.landmark && <p className="text-muted">Near: {order.landmark}</p>}
                </>
              ) : <p className="text-muted">Customer will collect the order.</p>}
              <p className="text-muted pt-2">Payment method: {PAYMENT_METHOD_LABEL[order.paymentMethod]}</p>
              {order.notes && <p className="pt-2 border-t border-line mt-2"><span className="text-muted">Note:</span> {order.notes}</p>}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
