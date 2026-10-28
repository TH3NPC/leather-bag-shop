"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "./ui";
import { Field } from "@/components/ui/Field";
import { api } from "@/lib/client";

type AdjType = "RESTOCK" | "CORRECTION" | "DAMAGED";

const TYPES: { value: AdjType; label: string; qty: string; hint: string }[] = [
  { value: "RESTOCK", label: "Stock received", qty: "Units received", hint: "Adds to current stock." },
  { value: "CORRECTION", label: "Count correction", qty: "Counted stock (new total)", hint: "Sets stock to the number you physically counted." },
  { value: "DAMAGED", label: "Damaged / lost", qty: "Units to remove", hint: "Removes units from stock." },
];

export function StockAdjustForm({ products, selectedId }: { products: { id: string; name: string; stock: number }[]; selectedId?: string }) {
  const router = useRouter();
  const [productId, setProductId] = useState(selectedId ?? "");
  const [type, setType] = useState<AdjType>("RESTOCK");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (selectedId) setProductId(selectedId); }, [selectedId]);

  const product = products.find((p) => p.id === productId);
  const t = TYPES.find((x) => x.value === type)!;
  const qty = Number(quantity);
  const preview = product && quantity !== "" && Number.isInteger(qty)
    ? type === "RESTOCK" ? product.stock + qty : type === "DAMAGED" ? product.stock - qty : qty
    : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await api("/api/admin/inventory/adjust", { body: { productId, type, quantity: qty, reason } });
    setBusy(false);
    setFields(res.fields ?? {});
    if (!res.ok) return setMsg({ ok: false, text: res.error ?? "Could not save." });
    setMsg({ ok: true, text: "Stock updated." });
    setQuantity("");
    setReason("");
    router.refresh();
  }

  return (
    <Card title="Adjust stock">
      <form onSubmit={submit} className="p-5 grid gap-4">
        <Field label="Product" error={fields.productId}>
          <select className="field h-10" value={productId} onChange={(e) => setProductId(e.target.value)} required>
            <option value="">Choose a product…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.stock})</option>)}
          </select>
        </Field>
        <Field label="Type">
          <select className="field h-10" value={type} onChange={(e) => setType(e.target.value as AdjType)}>
            {TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
        </Field>
        <Field label={t.qty} error={fields.quantity} hint={t.hint}>
          <input className="field h-10" type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </Field>
        <Field label="Reason" error={fields.reason}>
          <input className="field h-10" placeholder={type === "RESTOCK" ? "e.g. Delivery from workshop" : "e.g. Monthly count"} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} required />
        </Field>
        {preview !== null && (
          <p className={`text-[13px] ${preview < 0 ? "text-danger" : "text-charcoal"}`}>
            Stock: {product!.stock} → <strong className="font-medium">{preview}</strong>{preview < 0 && " (not allowed)"}
          </p>
        )}
        {msg && <p className={`text-[13px] px-3 py-2.5 ${msg.ok ? "text-success bg-success-bg" : "text-danger bg-danger-bg"}`} role="status">{msg.text}</p>}
        <button className="btn btn-primary" disabled={busy || !productId || quantity === "" || !reason.trim() || (preview ?? 0) < 0}>{busy ? "Saving…" : "Save adjustment"}</button>
      </form>
    </Card>
  );
}
