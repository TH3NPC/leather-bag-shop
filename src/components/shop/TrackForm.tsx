"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { api } from "@/lib/client";
import { t } from "@/i18n/en";

export function TrackForm({ defaultNumber = "" }: { defaultNumber?: string }) {
  const router = useRouter();
  const [number, setNumber] = useState(defaultNumber);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api<{ number: string; key: string }>("/api/orders/lookup", { body: { number, phone } });
    if (res.ok && res.data) {
      router.push(`/order/${res.data.number}?key=${encodeURIComponent(res.data.key)}`);
      return;
    }
    setBusy(false);
    setFields(res.fields ?? {});
    setError(res.fields ? null : res.error ?? t.order.notFound);
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label={t.order.number} error={fields.number}>
        <input className="field uppercase tracking-[0.04em]" placeholder="LB-261028-XXXX" value={number} onChange={(e) => setNumber(e.target.value)} maxLength={30} autoCapitalize="characters" />
      </Field>
      <Field label={t.checkout.phone} error={fields.phone}>
        <input className="field" type="tel" inputMode="tel" placeholder="09XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
      </Field>
      {error && <p className="text-[13px] text-danger" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={busy || !number || !phone}>
        {busy ? t.common.loading : t.order.find}
      </button>
    </form>
  );
}
