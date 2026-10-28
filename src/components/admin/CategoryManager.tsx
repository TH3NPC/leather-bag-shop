"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "./ui";
import { api } from "@/lib/client";

interface Category { id: string; name: string; slug: string; sortOrder: number; active: boolean; products: number }

function Row({ c, onError }: { c: Category; onError(msg: string | null): void }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: c.name, sortOrder: String(c.sortOrder), active: c.active });
  const [busy, setBusy] = useState(false);
  const dirty = form.name !== c.name || Number(form.sortOrder) !== c.sortOrder || form.active !== c.active;

  async function save() {
    setBusy(true);
    const res = await api(`/api/admin/categories/${c.id}`, { method: "PATCH", body: { ...form, sortOrder: Number(form.sortOrder) } });
    setBusy(false);
    onError(res.ok ? null : res.error ?? "Could not save.");
    if (res.ok) router.refresh();
  }
  async function remove() {
    if (!confirm(`Delete the category "${c.name}"?`)) return;
    setBusy(true);
    const res = await api(`/api/admin/categories/${c.id}`, { method: "DELETE" });
    setBusy(false);
    onError(res.ok ? null : res.error ?? "Could not delete.");
    if (res.ok) router.refresh();
  }

  return (
    <tr>
      <td><input className="field h-9 text-[14px] min-w-[160px]" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={60} aria-label="Name" /></td>
      <td><input className="field h-9 text-[14px] w-20" type="number" min={0} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} aria-label="Sort order" /></td>
      <td><label className="flex items-center gap-2 text-[13px] whitespace-nowrap"><input type="checkbox" className="size-4 accent-ink" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Visible</label></td>
      <td className="num">{c.products}</td>
      <td className="whitespace-nowrap text-right">
        <button onClick={save} disabled={!dirty || busy} className="btn btn-primary btn-sm">Save</button>
        <button onClick={remove} disabled={busy || c.products > 0} title={c.products > 0 ? "Move or archive its products first" : undefined} className="btn btn-ghost btn-sm text-danger ml-1">Delete</button>
      </td>
    </tr>
  );
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await api("/api/admin/categories", { body: { name, sortOrder: (categories.at(-1)?.sortOrder ?? 0) + 1, active: true } });
    setBusy(false);
    setError(res.ok ? null : res.error ?? "Could not add.");
    if (res.ok) { setName(""); router.refresh(); }
  }

  return (
    <div className="space-y-6">
      <Card title="Add category">
        <form onSubmit={add} className="p-5 flex gap-2">
          <input className="field h-10" placeholder="e.g. Travel bags" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <button className="btn btn-primary btn-sm h-10" disabled={!name.trim() || busy}>Add</button>
        </form>
      </Card>
      {error && <p className="text-[13px] text-danger bg-danger-bg px-3 py-2.5" role="alert">{error}</p>}
      <Card>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Name</th><th>Sort</th><th>Shop</th><th className="num">Products</th><th /></tr></thead>
            <tbody>{categories.map((c) => <Row key={c.id} c={c} onError={setError} />)}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
