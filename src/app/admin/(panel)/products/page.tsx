import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma, ProductStatus } from "@prisma/client";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { formatETB } from "@/lib/money";
import { Card, Empty, PageHeader } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/Pagination";

export const metadata: Metadata = { title: "Products" };
const PAGE_SIZE = 25;
const STATUS_LABEL: Record<ProductStatus, string> = { ACTIVE: "Active", UNAVAILABLE: "Hidden", ARCHIVED: "Archived" };

type Search = Promise<{ q?: string; category?: string; status?: string; page?: string }>;

export default async function ProductsPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const status = (["ACTIVE", "UNAVAILABLE", "ARCHIVED"] as const).find((s) => s === sp.status);
  const where: Prisma.ProductWhereInput = {
    status: status ?? { not: "ARCHIVED" },
    ...(sp.category ? { categoryId: sp.category } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [categories, total] = await Promise.all([
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.product.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(sp.page) || 1), pageCount);
  const products = await db.product.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true, name: true, sku: true, priceCents: true, costCents: true, stock: true, lowStockThreshold: true, status: true, featured: true, newArrival: true,
      category: { select: { name: true } },
      images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });

  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, category: sp.category, status, ...extra })) if (v) p.set(k, v);
    return p.toString();
  };

  return (
    <>
      <PageHeader title="Products" actions={<Link href="/admin/products/new" className="btn btn-primary btn-sm"><Plus size={16} /> Add product</Link>} />

      <form method="get" className="grid gap-2 sm:grid-cols-[1.5fr_1fr_1fr_auto] mb-5">
        <input name="q" defaultValue={q} placeholder="Search name or SKU" className="field h-10 text-[14px]" />
        <select name="category" defaultValue={sp.category ?? ""} className="field h-10 text-[14px]">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="status" defaultValue={status ?? ""} className="field h-10 text-[14px]">
          <option value="">Active and hidden</option>
          <option value="ACTIVE">Active</option>
          <option value="UNAVAILABLE">Hidden</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <div className="flex gap-2">
          <button className="btn btn-primary btn-sm h-10">Filter</button>
          <Link href="/admin/products" className="btn btn-ghost btn-sm h-10">Reset</Link>
        </div>
      </form>

      <Card>
        {products.length === 0 ? (
          <Empty title="No products found" action={{ href: "/admin/products/new", label: "Add product" }} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Product</th><th>Category</th><th className="num">Price</th><th className="num">Cost</th><th className="num">Stock</th><th>Status</th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 group">
                        <span className="relative w-10 aspect-[4/5] bg-sand shrink-0">
                          {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="40px" className="object-cover" />}
                        </span>
                        <span>
                          <span className="group-hover:underline">{p.name}</span>
                          <span className="block text-[12px] text-muted">
                            {[p.sku, p.featured && "Featured", p.newArrival && "New"].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="text-charcoal whitespace-nowrap">{p.category.name}</td>
                    <td className="num">{formatETB(p.priceCents)}</td>
                    <td className="num text-muted">{p.costCents === null ? "—" : formatETB(p.costCents)}</td>
                    <td className={`num ${p.stock === 0 ? "text-danger" : p.stock <= p.lowStockThreshold ? "text-warning" : ""}`}>{p.stock}</td>
                    <td><span className={`tag ${p.status === "ACTIVE" ? "bg-success-bg text-success" : "bg-sand text-charcoal"}`}>{STATUS_LABEL[p.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-3 text-[12px] text-muted">{total} {total === 1 ? "product" : "products"}</p>
      <Pagination page={page} pageCount={pageCount} hrefFor={(p) => `/admin/products?${qs({ page: String(p) })}`} />
    </>
  );
}
