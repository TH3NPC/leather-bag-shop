import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatETB } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { formatDateTime } from "@/lib/time";
import { FULFILLMENT_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/labels";
import { getSettings } from "@/server/settings";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata: Metadata = { title: "Receipt" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, settings] = await Promise.all([
    db.order.findUnique({ where: { id }, include: { items: true, payments: { orderBy: { receivedAt: "asc" } } } }),
    getSettings(),
  ]);
  if (!order) notFound();
  const due = order.status === "CANCELLED" ? 0 : Math.max(0, order.totalCents - order.paidCents);

  return (
    <div className="max-w-xl mx-auto bg-surface border border-line p-8 print:border-0 print:p-0">
      <div className="flex justify-between items-start no-print mb-6">
        <p className="text-[13px] text-muted">Print or save as PDF.</p>
        <PrintButton />
      </div>
      <header className="flex justify-between items-start gap-4 pb-5 border-b border-ink">
        <div>
          <p className="font-display text-3xl leading-none">{settings.shopName}</p>
          {settings.tagline && <p className="text-[12px] text-muted mt-1.5">{settings.tagline}</p>}
          {settings.contactPhone && <p className="text-[12px] text-muted">{settings.contactPhone}</p>}
        </div>
        <div className="text-right text-[13px]">
          <p className="font-medium tracking-[0.03em]">{order.number}</p>
          <p className="text-muted">{formatDateTime(order.createdAt)}</p>
          {order.status === "CANCELLED" && <p className="text-danger font-medium mt-1">CANCELLED</p>}
        </div>
      </header>

      <section className="py-4 text-[13px] grid grid-cols-2 gap-4 border-b border-line">
        <div>
          <p className="text-muted">Customer</p>
          <p>{order.customerName}</p>
          <p>{formatPhone(order.phone)}</p>
        </div>
        <div>
          <p className="text-muted">{FULFILLMENT_LABEL[order.fulfillment]}</p>
          {order.address ? <p>{order.address}{order.landmark ? ` (near ${order.landmark})` : ""}</p> : <p>Pickup</p>}
        </div>
      </section>

      <table className="w-full text-[13px] my-4">
        <thead><tr className="text-left text-muted"><th className="font-normal pb-2">Item</th><th className="font-normal pb-2 text-right">Qty</th><th className="font-normal pb-2 text-right">Price</th><th className="font-normal pb-2 text-right">Total</th></tr></thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id} className="border-t border-line">
              <td className="py-2">{i.productName}{i.color ? <span className="text-muted"> · {i.color}</span> : null}</td>
              <td className="py-2 text-right tabular-nums">{i.quantity}</td>
              <td className="py-2 text-right tabular-nums">{formatETB(i.unitPriceCents)}</td>
              <td className="py-2 text-right tabular-nums">{formatETB(i.lineTotalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="text-[13px] space-y-1 border-t border-ink pt-3">
        <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatETB(order.subtotalCents)}</dd></div>
        <div className="flex justify-between"><dt>Delivery</dt><dd className="tabular-nums">{formatETB(order.deliveryFeeCents)}</dd></div>
        <div className="flex justify-between font-medium text-[15px] pt-1"><dt>Total</dt><dd className="tabular-nums">{formatETB(order.totalCents)}</dd></div>
        <div className="flex justify-between"><dt>Paid</dt><dd className="tabular-nums">{formatETB(order.paidCents)}</dd></div>
        {order.refundedCents > 0 && <div className="flex justify-between"><dt>Refunded</dt><dd className="tabular-nums">−{formatETB(order.refundedCents)}</dd></div>}
        <div className="flex justify-between"><dt>Balance due</dt><dd className="tabular-nums">{formatETB(due)}</dd></div>
      </dl>

      <p className="mt-5 text-[12px] text-muted">
        Payment: {PAYMENT_METHOD_LABEL[order.paymentMethod]} · {PAYMENT_STATUS_LABEL[order.paymentStatus]}
        {order.payments.filter((p) => p.reference).map((p) => ` · Ref ${p.reference}`).join("")}
      </p>
      <p className="mt-6 text-center text-[12px] text-muted">Thank you for your order.</p>
    </div>
  );
}
