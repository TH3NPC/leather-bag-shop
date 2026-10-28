"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store, Truck } from "lucide-react";
import type { PaymentMethod } from "@prisma/client";
import { useCart } from "./CartProvider";
import { useCartQuote } from "./useCartQuote";
import { useTelegram } from "./TelegramProvider";
import { Field } from "@/components/ui/Field";
import { api } from "@/lib/client";
import { formatETB } from "@/lib/money";
import { PAYMENT_METHOD_LABEL } from "@/lib/labels";
import { t } from "@/i18n/en";

interface Props {
  settings: { deliveryFeeCents: number; deliveryNote: string; pickupAddress: string; paymentMethods: PaymentMethod[] };
}

const PAYMENT_HELP: Partial<Record<PaymentMethod, string>> = {
  CASH_ON_DELIVERY: "Pay in cash when you receive or collect your order.",
  BANK_TRANSFER: "The shop will send bank details after confirming your order.",
  TELEBIRR: "The shop will send its Telebirr number after confirming your order.",
};

const DRAFT_KEY = "shop.checkout.draft";

export function CheckoutForm({ settings }: Props) {
  const router = useRouter();
  const cart = useCart();
  const tg = useTelegram();
  const { quoted, usable, subtotalCents, loading, refresh } = useCartQuote();

  const [form, setForm] = useState({
    name: "", phone: "", fulfillment: "DELIVERY" as "DELIVERY" | "PICKUP", address: "", landmark: "", notes: "",
    paymentMethod: settings.paymentMethods[0] ?? "CASH_ON_DELIVERY",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);

  // Restore contact details from a previous visit (stored only on this device).
  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
      if (draft) setForm((f) => ({ ...f, name: draft.name ?? "", phone: draft.phone ?? "", address: draft.address ?? "", landmark: draft.landmark ?? "" }));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    if (tg.displayName) setForm((f) => (f.name ? f : { ...f, name: tg.displayName }));
  }, [tg.displayName]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const deliveryFee = form.fulfillment === "DELIVERY" ? settings.deliveryFeeCents : 0;
  const total = subtotalCents + deliveryFee;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const local: Record<string, string> = {};
    if (!form.name.trim()) local.name = "Name is required";
    if (!form.phone.trim()) local.phone = "Phone number is required";
    if (form.fulfillment === "DELIVERY" && !form.address.trim()) local.address = "Delivery address is required";
    if (Object.keys(local).length) { setErrors(local); return; }

    setSubmitting(true);
    const res = await api<{ number: string; key: string }>("/api/orders", {
      body: {
        items: usable.map((l) => ({ productId: l.productId, color: l.color, quantity: l.quantity })),
        name: form.name, phone: form.phone, fulfillment: form.fulfillment,
        address: form.address, landmark: form.landmark, notes: form.notes, paymentMethod: form.paymentMethod,
      },
      headers: tg.initData ? { "X-Telegram-Init-Data": tg.initData } : undefined,
    });

    if (res.ok && res.data) {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ name: form.name, phone: form.phone, address: form.address, landmark: form.landmark })); } catch { /* ignore */ }
      tg.haptic("success");
      setPlaced(true);
      cart.clear();
      router.replace(`/order/${res.data.number}?key=${encodeURIComponent(res.data.key)}&new=1`);
      return;
    }
    tg.haptic("error");
    setSubmitting(false);
    setErrors(res.fields ?? {});
    setFormError(res.error ?? t.common.error);
    // Stock or price may have changed: refresh the summary.
    if (res.status === 409) refresh();
  }

  if (placed) return <div className="py-16 text-center text-muted text-sm">{t.checkout.placing}</div>;

  if (cart.ready && cart.lines.length === 0) {
    return (
      <div className="py-16 text-center border-t border-line">
        <p className="display text-2xl">{t.cart.empty}</p>
        <Link href="/shop" className="btn btn-primary mt-7">{t.home.shopCollection}</Link>
      </div>
    );
  }

  const optionCls = (active: boolean) =>
    `flex items-start gap-3 p-4 border rounded-xs cursor-pointer transition-colors ${active ? "border-ink bg-surface" : "border-line-strong hover:border-charcoal"}`;

  return (
    <form onSubmit={submit} noValidate className="md:grid md:grid-cols-[1fr_380px] md:gap-12 items-start">
      <div className="space-y-10">
        <section>
          <h2 className="eyebrow mb-4">{t.checkout.contact}</h2>
          {tg.isTelegram && tg.displayName && <p className="text-[13px] text-muted mb-4">{t.checkout.telegramLinked(tg.displayName)}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.checkout.name} error={errors.name}>
              <input className="field" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={80} />
            </Field>
            <Field label={t.checkout.phone} error={errors.phone} hint={t.checkout.phoneHint}>
              <input className="field" type="tel" inputMode="tel" autoComplete="tel" placeholder="09XX XXX XXX" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20} />
            </Field>
          </div>
        </section>

        <section>
          <h2 className="eyebrow mb-4">{t.checkout.receive}</h2>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
            {(["DELIVERY", "PICKUP"] as const).map((f) => (
              <label key={f} className={optionCls(form.fulfillment === f)}>
                <input type="radio" name="fulfillment" className="sr-only" checked={form.fulfillment === f} onChange={() => set("fulfillment", f)} />
                {f === "DELIVERY" ? <Truck size={20} strokeWidth={1.5} className="mt-0.5 shrink-0" /> : <Store size={20} strokeWidth={1.5} className="mt-0.5 shrink-0" />}
                <span>
                  <span className="block text-[15px] text-ink">
                    {f === "DELIVERY" ? t.checkout.delivery : t.checkout.pickup}
                    <span className="text-muted"> · {f === "DELIVERY" ? (settings.deliveryFeeCents ? formatETB(settings.deliveryFeeCents) : "Free") : "Free"}</span>
                  </span>
                  <span className="block text-[13px] text-muted mt-0.5">{f === "DELIVERY" ? settings.deliveryNote : settings.pickupAddress}</span>
                </span>
              </label>
            ))}
          </div>

          {form.fulfillment === "DELIVERY" && (
            <div className="mt-5 grid gap-4">
              <Field label={t.checkout.address} error={errors.address} hint={t.checkout.addressHint}>
                <textarea className="field" rows={2} autoComplete="street-address" value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={300} />
              </Field>
              <Field label={t.checkout.landmark} error={errors.landmark} hint={t.checkout.landmarkHint}>
                <input className="field" value={form.landmark} onChange={(e) => set("landmark", e.target.value)} maxLength={200} />
              </Field>
            </div>
          )}
        </section>

        <section>
          <h2 className="eyebrow mb-4">{t.checkout.payment}</h2>
          <div className="grid gap-3" role="radiogroup">
            {settings.paymentMethods.map((m) => (
              <label key={m} className={optionCls(form.paymentMethod === m)}>
                <input type="radio" name="payment" className="sr-only" checked={form.paymentMethod === m} onChange={() => set("paymentMethod", m)} />
                <span className={`mt-1 size-4 shrink-0 rounded-full border ${form.paymentMethod === m ? "border-[5px] border-ink" : "border-line-strong"}`} aria-hidden />
                <span>
                  <span className="block text-[15px] text-ink">{PAYMENT_METHOD_LABEL[m]}</span>
                  <span className="block text-[13px] text-muted mt-0.5">{PAYMENT_HELP[m]}</span>
                </span>
              </label>
            ))}
          </div>
          {errors.paymentMethod && <p className="field-error">{errors.paymentMethod}</p>}
          <p className="mt-4 text-[13px] text-charcoal bg-sand px-4 py-3">{t.checkout.paymentNote}</p>
        </section>

        <section>
          <Field label={t.checkout.notes} error={errors.notes}>
            <textarea className="field" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={500} />
          </Field>
        </section>
      </div>

      <aside className="mt-10 md:mt-0 bg-surface border border-line p-5 md:p-6 md:sticky md:top-24">
        <h2 className="eyebrow mb-4">{t.checkout.summary}</h2>
        {quoted === null ? (
          <p className="text-sm text-muted py-4">{t.cart.refreshing}</p>
        ) : (
          <ul className="space-y-4 mb-5">
            {usable.map((l) => (
              <li key={`${l.productId}:${l.color}`} className="flex gap-3">
                <div className="relative w-14 aspect-[4/5] bg-sand shrink-0">
                  {l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-cover" />}
                </div>
                <div className="flex-1 min-w-0 text-[14px]">
                  <p className="text-ink leading-snug">{l.name}</p>
                  <p className="text-muted text-[13px]">{[l.color, `Qty ${l.quantity}`].filter(Boolean).join(" · ")}</p>
                </div>
                <p className="text-[14px] tabular-nums">{formatETB(l.priceCents * l.quantity)}</p>
              </li>
            ))}
          </ul>
        )}
        <dl className="space-y-2.5 text-[14px] border-t border-line pt-4">
          <div className="flex justify-between"><dt className="text-charcoal">{t.cart.subtotal}</dt><dd className="tabular-nums">{formatETB(subtotalCents)}</dd></div>
          <div className="flex justify-between"><dt className="text-charcoal">{t.cart.delivery}</dt><dd className="tabular-nums">{deliveryFee ? formatETB(deliveryFee) : "Free"}</dd></div>
          <div className="flex justify-between text-[16px] pt-2 border-t border-line"><dt>{t.cart.total}</dt><dd className="tabular-nums font-medium">{formatETB(total)}</dd></div>
        </dl>

        {formError && <p className="mt-4 text-[13px] text-danger bg-danger-bg px-3 py-2.5" role="alert">{formError}</p>}

        <button type="submit" className="btn btn-primary w-full mt-5" disabled={submitting || loading || usable.length === 0}>
          {submitting ? t.checkout.placing : `${t.checkout.placeOrder} · ${formatETB(total)}`}
        </button>
      </aside>
    </form>
  );
}
