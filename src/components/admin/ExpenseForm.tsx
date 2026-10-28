"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "./ui";
import { Field } from "@/components/ui/Field";
import { api } from "@/lib/client";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL } from "@/lib/labels";

const today = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);

export function ExpenseForm() {
  const router = useRouter();
  const [form, setForm] = useState({ category: "PACKAGING", amount: "", date: today(), description: "" });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await api("/api/admin/expenses", { body: form });
    setBusy(false);
    setFields(res.fields ?? {});
    setError(res.ok ? null : res.error ?? "Could not save.");
    if (res.ok) {
      setForm({ ...form, amount: "", description: "" });
      router.refresh();
    }
  }

  return (
    <Card title="Record expense">
      <form onSubmit={submit} className="p-5 grid gap-4" noValidate>
        <Field label="Category">
          <select className="field h-10" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY_LABEL[c]}</option>)}
          </select>
        </Field>
        <Field label="Amount (ETB)" error={fields.amount}>
          <input className="field h-10" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </Field>
        <Field label="Date" error={fields.date}>
          <input className="field h-10" type="date" max={today()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Description" error={fields.description}>
          <input className="field h-10" placeholder="e.g. Gift boxes (50 pcs)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={200} />
        </Field>
        {error && <p className="text-[13px] text-danger bg-danger-bg px-3 py-2.5" role="alert">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save expense"}</button>
      </form>
    </Card>
  );
}

export function DeleteExpenseButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="text-[12px] text-danger hover:underline disabled:opacity-50"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Delete this expense?")) return;
        setBusy(true);
        const res = await api(`/api/admin/expenses/${id}`, { method: "DELETE" });
        setBusy(false);
        if (!res.ok) alert(res.error);
        router.refresh();
      }}
    >
      Delete
    </button>
  );
}
