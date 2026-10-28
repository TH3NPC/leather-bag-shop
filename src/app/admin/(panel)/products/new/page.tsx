import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  const [categories, settings] = await Promise.all([
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    getSettings(),
  ]);
  return (
    <>
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink mb-4"><ArrowLeft size={15} /> Products</Link>
      <PageHeader title="Add product" />
      {categories.length === 0 ? (
        <p className="text-[14px]">Create a <Link href="/admin/categories" className="underline">category</Link> first.</p>
      ) : (
        <ProductForm categories={categories} defaultThreshold={settings.lowStockThreshold} />
      )}
    </>
  );
}
