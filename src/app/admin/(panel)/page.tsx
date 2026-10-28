import Link from "next/link";
import type { Metadata } from "next";
import { getDashboard, getSnapshot } from "@/server/reports";
import { resolveRange } from "@/lib/time";
import { formatETB } from "@/lib/money";
import { Card, PageHeader, Stat } from "@/components/admin/ui";
import { PeriodFilter } from "@/components/admin/PeriodFilter";
import { RevenueChart } from "@/components/admin/RevenueChart";

export const metadata: Metadata = { title: "Overview" };

type Search = Promise<{ period?: string; from?: string; to?: string; denied?: string }>;

export default async function OverviewPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const range = resolveRange(sp.period ?? "7d", sp.from, sp.to);
  const [d, snap] = await Promise.all([getDashboard(range), getSnapshot(resolveRange("today"), resolveRange("month"))]);
  const s = d.summary;

  return (
    <>
      <PageHeader title="Overview" description="All figures come from recorded orders and payments. Pending and cancelled orders are never counted as sales." />

      {sp.denied && <p className="mb-6 text-[13px] text-warning bg-warning-bg px-4 py-3">That page is only available to the shop owner.</p>}

      {/* Always-visible snapshot */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <Stat label="Today's sales" value={formatETB(snap.today.salesCents)} note={`Collected today: ${formatETB(snap.today.collectedCents)}`} />
        <Stat label="Today's orders" value={snap.today.orders} note="Placed today, excl. cancelled" />
        <Stat label="This month's sales" value={formatETB(snap.month.salesCents)} note={`Collected: ${formatETB(snap.month.collectedCents)}`} />
        <Stat label="This month's orders" value={snap.month.orders} note="Excl. cancelled" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="display text-[26px]">{range.label}</h2>
        <PeriodFilter preset={range.preset} from={range.from} to={range.to} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Sales" value={formatETB(s.salesCents)} note={`${s.saleOrders} confirmed orders (incl. ${formatETB(s.deliveryFeesCents)} delivery)`} />
        <Stat label="Collected" value={formatETB(s.netCollectedCents)} note={`Verified payments ${formatETB(s.collectedCents)} − refunds ${formatETB(s.refundsCents)}`} />
        <Stat label="Units sold" value={s.unitsSold} note="In confirmed orders" />
        <Stat label="Average order" value={formatETB(s.averageOrderCents)} note="Sales ÷ confirmed orders" />
        <Stat label="Awaiting confirmation" value={s.pendingOrders} note={`${formatETB(s.pendingValueCents)} not yet counted`} tone={s.pendingOrders ? "warning" : undefined} />
        <Stat label="Completed orders" value={s.completedOrders} note={`${s.cancelledOrders} cancelled in period`} />
        <Stat
          label="Est. gross profit"
          value={s.totalItemLines ? formatETB(s.grossProfitCents) : "—"}
          note={s.itemsWithoutCost ? `${s.itemsWithoutCost} of ${s.totalItemLines} items have no cost price and are excluded` : "Product revenue − cost price"}
        />
        <Stat label="Outstanding payments" value={formatETB(d.outstanding.amountCents)} note={`${d.outstanding.orders} confirmed orders not fully paid (all time)`} tone={d.outstanding.amountCents ? "warning" : undefined} />
      </div>

      <Card title="Daily revenue" className="mt-6">
        <div className="p-5"><RevenueChart series={d.series} /></div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card title="Best sellers" actions={<Link href={`/admin/reports?period=${range.preset}&from=${range.from}&to=${range.to}`} className="text-[12px] underline underline-offset-4">Full report</Link>}>
          {d.bestSellers.length === 0 ? (
            <p className="p-5 text-[13px] text-muted">No confirmed sales in this period.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Product</th><th className="num">Units</th><th className="num">Revenue</th></tr></thead>
              <tbody>
                {d.bestSellers.map((b) => (
                  <tr key={b.productId ?? b.name}>
                    <td>{b.productId ? <Link href={`/admin/products/${b.productId}`} className="hover:underline">{b.name}</Link> : b.name}</td>
                    <td className="num">{b.units}</td>
                    <td className="num">{formatETB(b.revenueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Low stock" actions={<Link href="/admin/inventory?filter=low" className="text-[12px] underline underline-offset-4">Inventory</Link>}>
          {d.lowStock.length === 0 ? (
            <p className="p-5 text-[13px] text-muted">All products are above their low-stock level.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Product</th><th className="num">In stock</th><th className="num">Alert at</th></tr></thead>
              <tbody>
                {d.lowStock.map((p) => (
                  <tr key={p.id}>
                    <td><Link href={`/admin/inventory?product=${p.id}`} className="hover:underline">{p.name}</Link></td>
                    <td className={`num ${p.stock === 0 ? "text-danger" : "text-warning"}`}>{p.stock === 0 ? "Out" : p.stock}</td>
                    <td className="num text-muted">{p.lowStockThreshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {d.pendingAll > 0 && (
        <Link href="/admin/orders?status=PENDING" className="mt-6 flex items-center justify-between bg-ink text-white px-5 py-4 text-[14px]">
          <span>{d.pendingAll} {d.pendingAll === 1 ? "order is" : "orders are"} waiting for confirmation</span>
          <span className="underline underline-offset-4">Review</span>
        </Link>
      )}
    </>
  );
}
