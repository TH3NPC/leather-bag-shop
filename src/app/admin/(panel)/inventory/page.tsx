import Link from "next/link";
import type { Metadata } from "next";
import { Download } from "lucide-react";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { MOVEMENT_LABEL } from "@/lib/labels";
import { SALE_STATUSES } from "@/server/orders";
import { Card, Empty, PageHeader, Stat } from "@/components/admin/ui";
import { StockAdjustForm } from "@/components/admin/StockAdjustForm";
import { Pagination } from "@/components/ui/Pagination";

export const metadata: Metadata = { title: "Inventory" };
const MOVES_PAGE = 30;

type Search = Promise<{ filter?: string; product?: string; q?: string; page?: string }>;

export default async function InventoryPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);

  const [products, soldRows, totalMoves] = await Promise.all([
    db.product.findMany({
      where: { status: { not: "ARCHIVED" }, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {}) },
      orderBy: [{ stock: "asc" }, { name: "asc" }],
      select: { id: true, name: true, sku: true, stock: true, lowStockThreshold: true, status: true },
    }),
    db.orderItem.groupBy({ by: ["productId"], where: { order: { status: { in: SALE_STATUSES } } }, _sum: { quantity: true } }),
    db.inventoryMovement.count({ where: sp.product ? { productId: sp.product } : {} }),
  ]);
  const sold = new Map(soldRows.map((r) => [r.productId, r._sum.quantity ?? 0]));

  const out = products.filter((p) => p.stock === 0);
  const low = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold);
  const shown = sp.filter === "low" ? [...out, ...low] : sp.filter === "out" ? out : products;
  const totalUnits = products.reduce((n, p) => n + p.stock, 0);

  const pageCount = Math.max(1, Math.ceil(totalMoves / MOVES_PAGE));
  const page = Math.min(Math.max(1, Number(sp.page) || 1), pageCount);
  const movements = await db.inventoryMovement.findMany({
    where: sp.product ? { productId: sp.product } : {},
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * MOVES_PAGE,
    take: MOVES_PAGE,
    include: { product: { select: { name: true } }, admin: { select: { name: true } }, order: { select: { id: true, number: true } } },
  });
  const selected = sp.product ? products.find((p) => p.id === sp.product) : undefined;

  const tab = (value: string | undefined, label: string) => (
    <Link
      href={`/admin/inventory${value ? `?filter=${value}` : ""}`}
      className={`h-9 px-3.5 inline-flex items-center text-[13px] border rounded-xs ${sp.filter === value ? "bg-ink border-ink text-white" : "border-line-strong text-charcoal hover:border-ink"}`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock is reserved when a customer places an order and returned if the order is cancelled."
        actions={<a href="/api/admin/export?type=inventory" className="btn btn-outline btn-sm"><Download size={15} /> Export CSV</a>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Products" value={products.length} note="Active and hidden" />
        <Stat label="Units in stock" value={totalUnits} />
        <Stat label="Low stock" value={low.length} tone={low.length ? "warning" : undefined} note="At or below alert level" />
        <Stat label="Out of stock" value={out.length} tone={out.length ? "danger" : undefined} />
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 items-center">
            {tab(undefined, "All")}
            {tab("low", "Low & out")}
            {tab("out", "Out of stock")}
            <form method="get" className="ml-auto">
              <input name="q" defaultValue={q} placeholder="Search" className="field h-9 text-[13px] w-44" />
            </form>
          </div>
          <Card>
            {shown.length === 0 ? (
              <Empty title={sp.filter ? "Nothing here — stock levels look healthy." : "No products"} />
            ) : (
              <div className="overflow-x-auto max-h-[560px]">
                <table className="table">
                  <thead className="sticky top-0 bg-surface"><tr><th>Product</th><th className="num">In stock</th><th className="num">Alert at</th><th className="num">Units sold</th><th /></tr></thead>
                  <tbody>
                    {shown.map((p) => (
                      <tr key={p.id} className={sp.product === p.id ? "bg-sand" : ""}>
                        <td>
                          <Link href={`/admin/products/${p.id}`} className="hover:underline">{p.name}</Link>
                          <span className="block text-[12px] text-muted">{[p.sku, p.status === "UNAVAILABLE" && "Hidden"].filter(Boolean).join(" · ")}</span>
                        </td>
                        <td className={`num ${p.stock === 0 ? "text-danger" : p.stock <= p.lowStockThreshold ? "text-warning" : ""}`}>{p.stock}</td>
                        <td className="num text-muted">{p.lowStockThreshold}</td>
                        <td className="num">{sold.get(p.id) ?? 0}</td>
                        <td className="text-right"><Link href={`/admin/inventory?product=${p.id}`} className="text-[13px] underline underline-offset-4 whitespace-nowrap">Adjust</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title={selected ? `Stock history · ${selected.name}` : "Stock history"} actions={selected ? <Link href="/admin/inventory" className="text-[12px] underline">Show all</Link> : undefined}>
            {movements.length === 0 ? (
              <Empty title="No stock movements yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Date</th>{!selected && <th>Product</th>}<th>Type</th><th className="num">Change</th><th className="num">After</th><th>Reason</th></tr></thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id}>
                        <td className="text-muted whitespace-nowrap">{formatDateTime(m.createdAt)}</td>
                        {!selected && <td>{m.product.name}</td>}
                        <td className="whitespace-nowrap">{MOVEMENT_LABEL[m.type]}</td>
                        <td className={`num ${m.change < 0 ? "text-danger" : "text-success"}`}>{m.change > 0 ? `+${m.change}` : m.change}</td>
                        <td className="num">{m.stockAfter}</td>
                        <td className="text-charcoal">
                          {m.order ? <Link href={`/admin/orders/${m.order.id}`} className="underline underline-offset-2">{m.order.number}</Link> : m.reason}
                          {m.admin && <span className="block text-[12px] text-muted">by {m.admin.name}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Pagination page={page} pageCount={pageCount} hrefFor={(p) => `/admin/inventory?${new URLSearchParams({ ...(sp.product ? { product: sp.product } : {}), page: String(p) })}`} />
        </div>

        <div className="lg:sticky lg:top-6">
          <StockAdjustForm products={products.map((p) => ({ id: p.id, name: p.name, stock: p.stock }))} selectedId={sp.product} />
        </div>
      </div>
    </>
  );
}
