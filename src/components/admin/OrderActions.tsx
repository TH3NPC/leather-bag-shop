"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus, PaymentMethod } from "@prisma/client";
import { Card } from "./ui";
import { Field } from "@/components/ui/Field";
import { api } from "@/lib/client";
import { centsToInput, formatETB } from "@/lib/money";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_METHODS } from "@/lib/labels";

interface Props {
  orderId: string;
  nextStatuses: OrderStatus[];
  paymentMethod: PaymentMethod;
  dueCents: number;
  refundableCents: number;
  cancelled: boolean;
}

const today = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);

export function OrderActions({ orderId, nextStatuses, paymentMethod, dueCents, refundableCents, cancelled }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pay, setPay] = useState<{ kind: "PAYMENT" | "REFUND"; amount: string; method: PaymentMethod; reference: string; note: string; receivedAt: string } | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function changeStatus(status: OrderStatus) {
    if (status === "CANCELLED" && !confirm("Cancel this order? Its items will be returned to stock. This cannot be undone.")) return;
    setBusy(status);
    setError(null);
    const res = await api(`/api/admin/orders/${orderId}/status`, { body: { status, note } });
    setBusy(null);
    if (!res.ok) return setError(res.error ?? "Could not update the order.");
    setNote("");
    router.refresh();
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!pay) return;
    setBusy("pay");
    setError(null);
    const res = await api(`/api/admin/orders/${orderId}/payments`, { body: pay });
    setBusy(null);
    setFields(res.fields ?? {});
    if (!res.ok) return setError(res.error ?? "Could not record the payment.");
    setPay(null);
    router.refresh();
  }

  const openPayment = (kind: "PAYMENT" | "REFUND") =>
    setPay({ kind, amount: centsToInput(kind === "PAYMENT" ? dueCents : refundableCents), method: paymentMethod, reference: "", note: "", receivedAt: today() });

  return (
    <Card title="Actions">
      <div className="px-5 py-4 space-y-5">
        {nextStatuses.length > 0 ? (
          <div>
            <p className="text-[13px] text-muted mb-2.5">Move order to</p>
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  disabled={!!busy}
                  className={`btn btn-sm ${s === "CANCELLED" ? "btn-danger" : s === nextStatuses[0] ? "btn-primary" : "btn-outline"}`}
                >
                  {busy === s ? "Saving…" : s === "CANCELLED" ? "Cancel order" : ORDER_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note for the history" className="field h-9 text-[13px] mt-3" maxLength={300} />
          </div>
        ) : (
          <p className="text-[13px] text-muted">This order is {cancelled ? "cancelled" : "completed"} and can no longer change status.</p>
        )}

        <div className="pt-4 border-t border-line">
          {!pay ? (
            <div className="flex flex-wrap gap-2">
              {dueCents > 0 && !cancelled && <button onClick={() => openPayment("PAYMENT")} className="btn btn-outline btn-sm">Record payment</button>}
              {refundableCents > 0 && <button onClick={() => openPayment("REFUND")} className="btn btn-ghost btn-sm">Record refund</button>}
              {dueCents === 0 && refundableCents === 0 && <p className="text-[13px] text-muted">No payment actions available.</p>}
            </div>
          ) : (
            <form onSubmit={submitPayment} className="space-y-3">
              <p className="text-[14px] font-medium">{pay.kind === "PAYMENT" ? "Record verified payment" : "Record refund"}</p>
              <p className="text-[12px] text-muted">
                {pay.kind === "PAYMENT" ? `Balance due: ${formatETB(dueCents)}. Only record money you have confirmed in your account or in hand.` : `Refundable: ${formatETB(refundableCents)}.`}
              </p>
              <Field label="Amount (ETB)" error={fields.amount}>
                <input className="field h-10" inputMode="decimal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
              </Field>
              <Field label="Method">
                <select className="field h-10" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value as PaymentMethod })}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
                </select>
              </Field>
              <Field label="Date received" error={fields.receivedAt}>
                <input type="date" className="field h-10" value={pay.receivedAt} max={today()} onChange={(e) => setPay({ ...pay, receivedAt: e.target.value })} />
              </Field>
              <Field label="Reference (transaction ID, receipt no.)" error={fields.reference}>
                <input className="field h-10" value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} maxLength={100} />
              </Field>
              <Field label="Note" error={fields.note}>
                <input className="field h-10" value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} maxLength={300} />
              </Field>
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm" disabled={busy === "pay"}>{busy === "pay" ? "Saving…" : "Save"}</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setPay(null); setFields({}); }}>Cancel</button>
              </div>
            </form>
          )}
        </div>

        {error && <p className="text-[13px] text-danger bg-danger-bg px-3 py-2.5" role="alert">{error}</p>}
      </div>
    </Card>
  );
}
