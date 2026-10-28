import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { CategoryManager } from "@/components/admin/CategoryManager";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, sortOrder: true, active: true, _count: { select: { products: { where: { status: { not: "ARCHIVED" } } } } } },
  });
  return (
    <>
      <PageHeader title="Categories" description="Hidden categories and their products are not shown in the shop. Lower sort numbers appear first." />
      <CategoryManager categories={categories.map((c) => ({ ...c, products: c._count.products }))} />
    </>
  );
}
