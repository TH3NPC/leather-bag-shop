import crypto from "node:crypto";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Check } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { formatETB } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { formatDateTime } from "@/lib/time";
import { FULFILLMENT_LABEL, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/labels";
import { getSettings } from "@/server/settings";
import { TrackForm } from "@/components/shop/TrackForm";
import { t } from "@/i18n/en";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ key?: string; new?: string }> };

const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a), bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

function steps(fulfillment: "DELIVERY" | "PICKUP"): OrderStatus[] {
  return ["PENDING", "CONFIRMED", "PREPARING", fulfillment === "PICKUP" ? "READY_FOR_PICKUP" : "OUT_FOR_DELIVERY", "COMPLETED"];
}

export default async function OrderPage({ params, searchParams }: Props) {
  const { number } = await params;
  const { key, new: isNew } = await searchParams;

  const order = await db.order.findUnique({
    where: { number: decodeURIComponent(number).toUpperCase() },
    include: { items: true },
  });

  // Without the private key, show the lookup form instead of the order.
  if (!order || !key || !safeEqual(key, order.accessKey)) {
    return (
      <div className="mx-auto max-w-md px-4 pt-10 pb-16">
        <h1 className="display text-[34px] mb-2">{t.order.track}</h1>
        <p className="text-sm text-muted mb-6">{t.order.trackText}</p>
        <TrackForm defaultNumber={order ? order.number : ""} />
      </div>
    );
  }

  const settings = await getSettings();
  const flow = steps(order.fulfillment);
  const currentIndex = flow.indexOf(order.status);
  const cancelled = order.status === "CANCELLED";

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 pt-8 md:pt-12 pb-16">
      {isNew && (
        <div className="mb-8 flex items-start gap-3">
          <span className="size-9 shrink-0 grid place-items-center rounded-full bg-ink text-white"><Check size={18} /></span>
          <div>
            <h1 className="display text-[30px] md:text-[38px] leading-tight">{t.order.thanks}</h1>
            <p className="mt-2 text-[14px] text-charcoal">{t.checkout.paymentNote}</p>
          </div>
        </div>
      )}

      <div className="bg-surface border border-line p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{t.order.number}</p>
            <p className="mt-1 text-[24px] md:text-[28px] font-medium tracking-[0.04em] tabular-nums select-all">{order.number}</p>
            <p className="text-[13px] text-muted mt-1">{t.order.keep}</p>
          </div>
          <div className="text-right text-[13px] text-muted">
            <p>{formatDateTime(order.createdAt)}</p>
          </div>
        </div>

        {/* Status */}
        <div className="mt-7 pt-6 border-t border-line">
          <p className="eyebrow mb-4">{t.order.status}</p>
          {cancelled ? (
            <p className="text-danger text-[15px]">{ORDER_STATUS_LABEL.CANCELLED}</p>
          ) : (
            <ol className="grid grid-cols-5 gap-1.5">
              {flow.map((s, i) => (
                <li key={s}>
                  <div className={`h-[3px] ${i <= currentIndex ? "bg-ink" : "bg-line"}`} />
                  <p className={`mt-2 text-[11px] md:text-[12px] leading-tight ${i === currentIndex ? "text-ink font-medium" : i < currentIndex ? "text-charcoal" : "text-faint"}`}>
                    {ORDER_STATUS_LABEL[s]}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Payment */}
        <div className="mt-7 pt-6 border-t border-line grid gap-5 sm:grid-cols-2 text-[14px]">
          <div>
            <p className="eyebrow mb-2">{t.order.payment}</p>
            <p className="text-ink">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</p>
            <p className="text-muted mt-0.5">
              {order.paymentStatus === "UNPAID" ? t.order.awaiting : PAYMENT_STATUS_LABEL[order.paymentStatus]}
            </p>
            {order.status !== "PENDING" && !cancelled && order.paymentStatus !== "PAID" && (
              <>
                {order.paymentMethod === "BANK_TRANSFER" && settings.bankDetails && <p className="mt-2 text-charcoal whitespace-pre-line">{settings.bankDetails}</p>}
                {order.paymentMethod === "TELEBIRR" && settings.telebirrDetails && <p className="mt-2 text-charcoal whitespace-pre-line">{settings.telebirrDetails}</p>}
              </>
            )}
          </div>
          <div>
            <p className="eyebrow mb-2">{FULFILLMENT_LABEL[order.fulfillment]}</p>
            <p className="text-ink">{order.customerName} · {formatPhone(order.phone)}</p>
            {order.fulfillment === "DELIVERY" ? (
              <p className="text-muted mt-0.5">{order.address}{order.landmark ? ` (near ${order.landmark})` : ""}</p>
            ) : (
              <p className="text-muted mt-0.5">{settings.pickupAddress}</p>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="mt-7 pt-6 border-t border-line">
          <p className="eyebrow mb-4">{t.order.items}</p>
          <ul className="space-y-4">
            {order.items.map((i) => (
              <li key={i.id} className="flex gap-3 text-[14px]">
                <div className="relative w-14 aspect-[4/5] bg-sand shrink-0">
                  {i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="56px" className="object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="text-ink">{i.productName}</p>
                  <p className="text-muted text-[13px]">{[i.color, `${i.quantity} × ${formatETB(i.unitPriceCents)}`].filter(Boolean).join(" · ")}</p>
                </div>
                <p className="tabular-nums">{formatETB(i.lineTotalCents)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-5 pt-4 border-t border-line space-y-2 text-[14px]">
            <div className="flex justify-between"><dt className="text-charcoal">{t.cart.subtotal}</dt><dd className="tabular-nums">{formatETB(order.subtotalCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-charcoal">{t.cart.delivery}</dt><dd className="tabular-nums">{order.deliveryFeeCents ? formatETB(order.deliveryFeeCents) : "Free"}</dd></div>
            <div className="flex justify-between text-[16px] pt-2"><dt>{t.cart.total}</dt><dd className="tabular-nums font-medium">{formatETB(order.totalCents)}</dd></div>
          </dl>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link href="/shop" className="btn btn-primary">{t.order.continue}</Link>
        <Link href="/track" className="btn btn-outline">{t.order.myOrders}</Link>
      </div>
    </div>
  );
}
