import Link from "next/link";
import type { Metadata } from "next";
import { getShopCategories, parseSort, searchProducts } from "@/server/catalog";
import { ProductGrid } from "@/components/shop/ProductCard";
import { CatalogControls } from "@/components/shop/CatalogControls";
import { Pagination } from "@/components/ui/Pagination";
import { t } from "@/i18n/en";

export const metadata: Metadata = { title: "Shop" };

type Search = Promise<{ q?: string; category?: string; sort?: string; page?: string; focus?: string }>;

export default async function ShopPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const sort = parseSort(sp.sort);
  const [categories, result] = await Promise.all([
    getShopCategories(),
    searchProducts({ q: sp.q, category: sp.category, sort, page: Number(sp.page) || 1 }),
  ]);
  const activeCategory = categories.find((c) => c.slug === sp.category);

  const hrefFor = (page: number) => {
    const p = new URLSearchParams();
    if (sp.q) p.set("q", sp.q);
    if (sp.category) p.set("category", sp.category);
    if (sp.sort) p.set("sort", sp.sort);
    if (page > 1) p.set("page", String(page));
    const s = p.toString();
    return `/shop${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 pt-6 md:pt-10 pb-12">
      <h1 className="display text-[34px] md:text-[48px]">{activeCategory?.name ?? t.catalog.title}</h1>

      <CatalogControls
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        q={sp.q ?? ""}
        category={sp.category ?? ""}
        sort={sort}
        autoFocus={sp.focus === "search"}
      />

      <p className="mt-5 mb-4 text-[13px] text-muted" aria-live="polite">{t.catalog.results(result.total)}</p>

      {result.items.length > 0 ? (
        <>
          <ProductGrid products={result.items} priorityCount={4} />
          <Pagination page={result.page} pageCount={result.pageCount} hrefFor={hrefFor} />
        </>
      ) : (
        <div className="py-20 text-center border-t border-line">
          <p className="display text-2xl">{t.catalog.emptyTitle}</p>
          <p className="mt-2 text-muted text-sm">{t.catalog.emptyText}</p>
          <Link href="/shop" className="btn btn-outline btn-sm mt-6">{t.catalog.clear}</Link>
        </div>
      )}
    </div>
  );
}
