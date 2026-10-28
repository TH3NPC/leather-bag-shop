"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PaymentMethod } from "@prisma/client";
import { Card } from "./ui";
import { Field } from "@/components/ui/Field";
import { api } from "@/lib/client";
import { MANUAL_PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "@/lib/labels";

interface SettingsData {
  shopName: string; tagline: string; heroTitle: string; heroSubtitle: string; heroImageUrl: string;
  promoActive: boolean; promoTitle: string; promoText: string;
  contactPhone: string; pickupAddress: string; deliveryFee: string; deliveryNote: string;
  paymentMethods: PaymentMethod[]; bankDetails: string; telebirrDetails: string; lowStockThreshold: string;
}

export function SettingsForm({ initial }: { initial: SettingsData }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof SettingsData>(k: K, v: SettingsData[K]) => { setForm((f) => ({ ...f, [k]: v })); setMsg(null); };

  async function uploadHero(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    const res = await api<{ url: string }>("/api/admin/uploads", { body });
    setUploading(false);
    if (res.ok && res.data) set("heroImageUrl", res.data.url);
    else setMsg({ ok: false, text: res.error ?? "Upload failed." });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await api("/api/admin/settings", { method: "PUT", body: { ...form, heroImageUrl: form.heroImageUrl || null, lowStockThreshold: Number(form.lowStockThreshold) } });
    setBusy(false);
    setFields(res.fields ?? {});
    setMsg(res.ok ? { ok: true, text: "Settings saved. The shop is updated." } : { ok: false, text: res.error ?? "Could not save." });
    if (res.ok) router.refresh();
  }

  const text = (k: keyof SettingsData, label: string, hint?: string, max = 200) => (
    <Field label={label} error={fields[k]} hint={hint}>
      <input className="field" value={form[k] as string} onChange={(e) => set(k, e.target.value as never)} maxLength={max} />
    </Field>
  );

  return (
    <form onSubmit={submit} noValidate className="grid lg:grid-cols-2 gap-6 items-start">
      <Card title="Shop identity & home page">
        <div className="p-5 grid gap-4">
          {text("shopName", "Shop name", "Placeholder until the owner chooses the final brand name.", 60)}
          {text("tagline", "Tagline", undefined, 120)}
          {text("heroTitle", "Home headline", undefined, 100)}
          <Field label="Home description" error={fields.heroSubtitle}>
            <textarea className="field" rows={2} value={form.heroSubtitle} onChange={(e) => set("heroSubtitle", e.target.value)} maxLength={240} />
          </Field>
          <Field label="Home image" hint="Landscape or square photo, under 4 MB.">
            <input type="file" accept="image/jpeg,image/png,image/webp" className="block text-[13px]" disabled={uploading} onChange={(e) => uploadHero(e.target.files?.[0])} />
          </Field>
          {uploading && <p className="text-[12px] text-muted">Uploading…</p>}
          {text("contactPhone", "Contact phone (shown in footer and receipts)", undefined, 30)}
        </div>
      </Card>

      <div className="space-y-6">
        <Card title="Promotion">
          <div className="p-5 grid gap-4">
            <label className="flex items-center gap-2.5 text-[14px]"><input type="checkbox" className="size-4 accent-ink" checked={form.promoActive} onChange={(e) => set("promoActive", e.target.checked)} /> Show promotion on home page</label>
            {text("promoTitle", "Title", undefined, 80)}
            {text("promoText", "Text", undefined, 240)}
          </div>
        </Card>

        <Card title="Delivery & pickup">
          <div className="p-5 grid gap-4">
            {text("deliveryFee", "Delivery fee (ETB)", "Added to delivery orders. Use 0 for free delivery.", 12)}
            {text("deliveryNote", "Delivery note", "e.g. Delivery within Addis Ababa, 1–2 days.")}
            {text("pickupAddress", "Pickup location", undefined, 300)}
          </div>
        </Card>

        <Card title="Payment methods">
          <div className="p-5 grid gap-4">
            {MANUAL_PAYMENT_METHODS.map((m) => (
              <label key={m} className="flex items-center gap-2.5 text-[14px]">
                <input type="checkbox" className="size-4 accent-ink" checked={form.paymentMethods.includes(m)}
                  onChange={(e) => set("paymentMethods", e.target.checked ? [...form.paymentMethods, m] : form.paymentMethods.filter((x) => x !== m))} />
                {PAYMENT_METHOD_LABEL[m]}
              </label>
            ))}
            {fields.paymentMethods && <p className="field-error">{fields.paymentMethods}</p>}
            <Field label="Bank transfer details" hint="Shown to customers after you confirm their order." error={fields.bankDetails}>
              <textarea className="field" rows={3} value={form.bankDetails} onChange={(e) => set("bankDetails", e.target.value)} maxLength={500} />
            </Field>
            <Field label="Telebirr details" hint="e.g. merchant number and name." error={fields.telebirrDetails}>
              <textarea className="field" rows={2} value={form.telebirrDetails} onChange={(e) => set("telebirrDetails", e.target.value)} maxLength={300} />
            </Field>
            {text("lowStockThreshold", "Default low-stock alert for new products", undefined, 5)}
          </div>
        </Card>

        {msg && <p className={`text-[13px] px-3 py-2.5 ${msg.ok ? "text-success bg-success-bg" : "text-danger bg-danger-bg"}`} role="status">{msg.text}</p>}
        <button className="btn btn-primary w-full" disabled={busy || uploading}>{busy ? "Saving…" : "Save settings"}</button>
      </div>
    </form>
  );
}
