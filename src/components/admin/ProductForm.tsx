"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, X } from "lucide-react";
import type { ProductStatus } from "@prisma/client";
import { Card } from "./ui";
import { Field } from "@/components/ui/Field";
import { api } from "@/lib/client";
import { centsToInput, formatETB, parseETB } from "@/lib/money";

interface ProductData {
  id: string;
  name: string;
  sku: string;
  description: string;
  priceCents: number;
  costCents: number | null;
  categoryId: string;
  colors: string[];
  stock: number;
  lowStockThreshold: number;
  status: ProductStatus;
  featured: boolean;
  newArrival: boolean;
  images: { url: string; alt: string }[];
}

interface Props {
  categories: { id: string; name: string }[];
  defaultThreshold: number;
  product?: ProductData;
}

export function ProductForm({ categories, defaultThreshold, product }: Props) {
  const router = useRouter();
  const editing = !!product;
  const [form, setForm] = useState({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    description: product?.description ?? "",
    price: product ? centsToInput(product.priceCents) : "",
    cost: product ? centsToInput(product.costCents) : "",
    categoryId: product?.categoryId ?? categories[0]?.id ?? "",
    colors: product?.colors ?? [],
    lowStockThreshold: String(product?.lowStockThreshold ?? defaultThreshold),
    initialStock: "0",
    status: product?.status ?? ("ACTIVE" as ProductStatus),
    featured: product?.featured ?? false,
    newArrival: product?.newArrival ?? !editing,
    images: product?.images ?? [],
  });
  const [colorInput, setColorInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
    setSaved(false);
  };

  const price = parseETB(form.price);
  const cost = form.cost ? parseETB(form.cost) : null;
  const margin = price && cost !== null && price > 0 ? Math.round(((price - cost) / price) * 100) : null;

  function addColor() {
    const c = colorInput.trim();
    if (c && !form.colors.some((x) => x.toLowerCase() === c.toLowerCase())) set("colors", [...form.colors, c]);
    setColorInput("");
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    const added: { url: string; alt: string }[] = [];
    for (const file of Array.from(files).slice(0, 8 - form.images.length)) {
      const body = new FormData();
      body.append("file", file);
      const res = await api<{ url: string }>("/api/admin/uploads", { body });
      if (!res.ok || !res.data) { setError(res.error ?? "Upload failed."); break; }
      added.push({ url: res.data.url, alt: form.name });
    }
    set("images", [...form.images, ...added]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  const moveImage = (i: number, dir: -1 | 1) => {
    const next = [...form.images];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    set("images", next);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      ...form,
      cost: form.cost || null,
      lowStockThreshold: Number(form.lowStockThreshold),
      ...(editing ? {} : { initialStock: Number(form.initialStock) }),
    };
    const res = editing
      ? await api(`/api/admin/products/${product.id}`, { method: "PATCH", body })
      : await api<{ id: string }>("/api/admin/products", { body });
    setSaving(false);
    if (!res.ok) {
      setErrors(Object.fromEntries(Object.entries(res.fields ?? {}).map(([k, v]) => [k.split(".")[0], v])));
      setError(res.error ?? "Could not save.");
      return;
    }
    if (!editing) {
      router.push(`/admin/products/${(res.data as { id: string }).id}`);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function remove() {
    if (!product || !confirm("Delete this product? If it has been ordered before, it will be archived instead so order history stays intact.")) return;
    const res = await api<{ archived: boolean }>(`/api/admin/products/${product.id}`, { method: "DELETE" });
    if (!res.ok) return setError(res.error ?? "Could not delete.");
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="space-y-6">
        <Card title="Details">
          <div className="p-5 grid gap-4">
            <Field label="Name" error={errors.name}>
              <input className="field" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} />
            </Field>
            <Field label="Description" error={errors.description} hint="Shown on the product page. Include size, materials and features.">
              <textarea className="field" rows={7} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={4000} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Category" error={errors.categoryId}>
                <select className="field" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="SKU / product code (optional)" error={errors.sku}>
                <input className="field" value={form.sku} onChange={(e) => set("sku", e.target.value)} maxLength={40} />
              </Field>
            </div>
          </div>
        </Card>

        <Card title="Photos">
          <div className="p-5">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {form.images.map((img, i) => (
                <div key={img.url} className="relative">
                  <div className="relative aspect-[4/5] bg-sand">
                    <Image src={img.url} alt="" fill sizes="160px" className="object-cover" />
                    {i === 0 && <span className="absolute left-1 top-1 tag bg-ink text-white">Main</span>}
                  </div>
                  <div className="flex justify-between mt-1">
                    <div className="flex">
                      <button type="button" disabled={i === 0} onClick={() => moveImage(i, -1)} className="size-7 grid place-items-center disabled:opacity-30" aria-label="Move earlier"><ArrowUp size={14} className="-rotate-90" /></button>
                      <button type="button" disabled={i === form.images.length - 1} onClick={() => moveImage(i, 1)} className="size-7 grid place-items-center disabled:opacity-30" aria-label="Move later"><ArrowDown size={14} className="-rotate-90" /></button>
                    </div>
                    <button type="button" onClick={() => set("images", form.images.filter((_, j) => j !== i))} className="size-7 grid place-items-center text-danger" aria-label="Remove photo"><X size={15} /></button>
                  </div>
                </div>
              ))}
              {form.images.length < 8 && (
                <label className={`aspect-[4/5] border border-dashed border-line-strong grid place-items-center text-center cursor-pointer hover:border-ink ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                  <span className="text-[12px] text-muted px-2">
                    <ImagePlus size={20} strokeWidth={1.5} className="mx-auto mb-1.5" />
                    {uploading ? "Uploading…" : "Add photos"}
                  </span>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => upload(e.target.files)} />
                </label>
              )}
            </div>
            <p className="field-hint">JPEG, PNG or WebP, up to 4 MB each. The first photo is the main image. Portrait photos (4:5) look best.</p>
          </div>
        </Card>

        <Card title="Colors">
          <div className="p-5">
            <div className="flex flex-wrap gap-2 mb-3">
              {form.colors.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 h-8 pl-3 pr-1 border border-line-strong text-[13px]">
                  {c}
                  <button type="button" onClick={() => set("colors", form.colors.filter((x) => x !== c))} className="size-6 grid place-items-center text-muted hover:text-danger" aria-label={`Remove ${c}`}><X size={13} /></button>
                </span>
              ))}
              {form.colors.length === 0 && <span className="text-[13px] text-muted">No color options. Customers will not be asked to choose one.</span>}
            </div>
            <div className="flex gap-2">
              <input className="field h-10" placeholder="e.g. Cognac" value={colorInput} onChange={(e) => setColorInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addColor(); } }} maxLength={40} />
              <button type="button" onClick={addColor} className="btn btn-outline btn-sm h-10">Add</button>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-6 lg:sticky lg:top-6">
        <Card title="Pricing">
          <div className="p-5 grid gap-4">
            <Field label="Selling price (ETB)" error={errors.price}>
              <input className="field" inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="2500" />
            </Field>
            <Field label="Cost price (ETB, optional)" error={errors.cost} hint="Used only to estimate profit. Never shown to customers.">
              <input className="field" inputMode="decimal" value={form.cost} onChange={(e) => set("cost", e.target.value)} placeholder="1200" />
            </Field>
            {margin !== null && price && cost !== null && (
              <p className="text-[13px] text-charcoal">Margin: {formatETB(price - cost)} per unit ({margin}%)</p>
            )}
          </div>
        </Card>

        <Card title="Stock & visibility">
          <div className="p-5 grid gap-4">
            {editing ? (
              <p className="text-[14px]">In stock: <strong className="font-medium">{product.stock}</strong> · <Link href={`/admin/inventory?product=${product.id}`} className="underline underline-offset-4">Adjust stock</Link></p>
            ) : (
              <Field label="Opening stock" error={errors.initialStock}>
                <input className="field" type="number" min={0} value={form.initialStock} onChange={(e) => set("initialStock", e.target.value)} />
              </Field>
            )}
            <Field label="Low-stock alert at" error={errors.lowStockThreshold}>
              <input className="field" type="number" min={0} value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)} />
            </Field>
            <Field label="Status">
              <select className="field" value={form.status} onChange={(e) => set("status", e.target.value as ProductStatus)}>
                <option value="ACTIVE">Active — visible in the shop</option>
                <option value="UNAVAILABLE">Hidden — not shown to customers</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </Field>
            <label className="flex items-center gap-2.5 text-[14px]"><input type="checkbox" className="size-4 accent-ink" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} /> Featured on home page</label>
            <label className="flex items-center gap-2.5 text-[14px]"><input type="checkbox" className="size-4 accent-ink" checked={form.newArrival} onChange={(e) => set("newArrival", e.target.checked)} /> Mark as new arrival</label>
          </div>
        </Card>

        {error && <p className="text-[13px] text-danger bg-danger-bg px-3 py-2.5" role="alert">{error}</p>}
        {saved && <p className="text-[13px] text-success bg-success-bg px-3 py-2.5" role="status">Saved.</p>}
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1" disabled={saving || uploading}>{saving ? "Saving…" : editing ? "Save changes" : "Create product"}</button>
          {editing && <button type="button" onClick={remove} className="btn btn-danger">Delete</button>}
        </div>
      </div>
    </form>
  );
}
