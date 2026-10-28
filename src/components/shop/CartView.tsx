"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { useCart } from "./CartProvider";
import { useCartQuote, type QuotedLine } from "./useCartQuote";
import { QuantityStepper } from "./QuantityStepper";
import { formatETB } from "@/lib/money";
import { t } from "@/i18n/en";

function Notice({ line }: { line: QuotedLine }) {
  if (line.notice === "unavailable") return <p className="text-[12px] text-danger mt-1">{t.cart.unavailable}</p>;
  if (line.notice === "reduced") return <p className="text-[12px] text-warning mt-1">{t.cart.adjusted(line.quantity)}</p>;
  if (line.notice === "price") return <p className="text-[12px] text-warning mt-1">{t.cart.priceChanged}</p>;
  return null;
}

export function CartView() {
  const cart = useCart();
  const { quoted, usable, subtotalCents, loading, error, refresh } = useCartQuote();

  if (!cart.ready || (cart.lines.length > 0 && quoted === null && !error)) {
    return <div className="py-16 text-center text-muted text-sm">{t.cart.refreshing}</div>;
  }

  if (cart.lines.length === 0) {
    return (
      <div className="py-16 text-center border-t border-line">
        <p className="display text-2xl">{t.cart.empty}</p>
        <p className="mt-2 text-sm text-muted">{t.cart.emptyText}</p>
        <Link href="/shop" className="btn btn-primary mt-7">{t.home.shopCollection}</Link>
      </div>
    );
  }

  const lines = quoted ?? cart.lines.map((l) => ({ ...l, available: true, stock: 20, notice: null }) as QuotedLine);

  return (
    <div className="md:grid md:grid-cols-[1fr_340px] md:gap-12 items-start">
      <ul className="border-t border-line">
        {lines.map((line) => (
          <li key={`${line.productId}:${line.color}`} className="flex gap-4 py-5 border-b border-line">
            <Link href={`/product/${line.slug}`} className="relative w-24 md:w-28 aspect-[4/5] shrink-0 bg-sand">
              {line.image && <Image src={line.image} alt="" fill sizes="112px" className={`object-cover ${line.available ? "" : "opacity-50"}`} />}
            </Link>
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/product/${line.slug}`} className="text-[15px] text-ink leading-snug">{line.name}</Link>
                  {line.color && <p className="text-[13px] text-muted mt-0.5">{line.color}</p>}
                  <Notice line={line} />
                </div>
                <button
                  type="button"
                  onClick={() => cart.remove(line.productId, line.color)}
                  className="size-8 -mr-1.5 -mt-1 grid place-items-center text-muted hover:text-ink shrink-0"
                  aria-label={`${t.cart.remove} ${line.name}`}
                >
                  <X size={18} strokeWidth={1.6} />
                </button>
              </div>
              <div className="mt-auto pt-3 flex items-end justify-between gap-3">
                {line.available ? (
                  <QuantityStepper
                    size="sm"
                    value={line.quantity}
                    max={Math.min(20, line.stock)}
                    onChange={(v) => cart.setQuantity(line.productId, line.color, v)}
                  />
                ) : <span />}
                <p className="text-[15px] tabular-nums text-ink">{formatETB(line.priceCents * line.quantity)}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="mt-8 md:mt-0 bg-surface border border-line p-5 md:p-6 md:sticky md:top-24">
        <dl className="space-y-3 text-[14px]">
          <div className="flex justify-between"><dt className="text-charcoal">{t.cart.subtotal}</dt><dd className="tabular-nums">{formatETB(subtotalCents)}</dd></div>
          <div className="flex justify-between"><dt className="text-charcoal">{t.cart.delivery}</dt><dd className="text-muted">{t.cart.deliveryAtCheckout}</dd></div>
        </dl>
        {error && (
          <p className="mt-4 text-[13px] text-danger" role="alert">
            {error} <button type="button" onClick={refresh} className="underline">{t.common.retry}</button>
          </p>
        )}
        <Link
          href="/checkout"
          aria-disabled={usable.length === 0 || loading}
          className={`btn btn-primary w-full mt-6 ${usable.length === 0 || loading ? "pointer-events-none opacity-45" : ""}`}
        >
          {t.cart.checkout}
        </Link>
        <Link href="/shop" className="block text-center text-[13px] text-charcoal underline underline-offset-4 mt-4">{t.order.continue}</Link>
      </aside>
    </div>
  );
}
