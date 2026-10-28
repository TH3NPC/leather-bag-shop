import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { formatETB } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { Card, PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories, sold] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        priceHistory: { orderBy: { createdAt: "desc" }, take: 10, include: { changedBy: { select: { name: true } } } },
      },
    }),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.orderItem.aggregate({ where: { productId: id, order: { status: { notIn: ["PENDING", "CANCELLED"] } } }, _sum: { quantity: true } }),
  ]);
  if (!product) notFound();

  return (
    <>
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink mb-4"><ArrowLeft size={15} /> Products</Link>
      <PageHeader
        title={product.name}
        description={`In stock: ${product.stock} · Units sold (confirmed orders): ${sold._sum.quantity ?? 0}`}
        actions={product.status === "ACTIVE" ? <Link href={`/product/${product.slug}`} target="_blank" className="btn btn-outline btn-sm"><ExternalLink size={15} /> View in shop</Link> : undefined}
      />
      <ProductForm
        categories={categories}
        defaultThreshold={product.lowStockThreshold}
        product={{
          id: product.id,
          name: product.name,
          sku: product.sku ?? "",
          description: product.description,
          priceCents: product.priceCents,
          costCents: product.costCents,
          categoryId: product.categoryId,
          colors: product.colors,
          stock: product.stock,
          lowStockThreshold: product.lowStockThreshold,
          status: product.status,
          featured: product.featured,
          newArrival: product.newArrival,
          images: product.images.map((i) => ({ url: i.url, alt: i.alt })),
        }}
      />

      <Card title="Price history" className="mt-6">
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Changed</th><th>By</th><th className="num">Price</th><th className="num">Cost</th></tr></thead>
            <tbody>
              {product.priceHistory.map((h) => (
                <tr key={h.id}>
                  <td className="text-muted">{formatDateTime(h.createdAt)}</td>
                  <td>{h.changedBy?.name ?? "Initial / import"}</td>
                  <td className="num">{formatETB(h.priceCents)}</td>
                  <td className="num">{h.costCents === null ? "—" : formatETB(h.costCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-3 text-[12px] text-muted">Orders always keep the price that was charged when they were placed.</p>
      </Card>
    </>
  );
}
