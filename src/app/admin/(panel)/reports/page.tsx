import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { resolveRange } from "@/lib/time";
import { formatETB } from "@/lib/money";
import { EXPENSE_CATEGORY_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/labels";
import { getReport } from "@/server/reports";
import { Card, PageHeader, Stat } from "@/components/admin/ui";
import { PeriodFilter } from "@/components/admin/PeriodFilter";

export const metadata: Metadata = { title: "Reports" };

type Search = Promise<{ period?: string; from?: string; to?: string; view?: string }>;

const weekLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function ReportsPage({ searchParams }: { searchParams: Search }) {
  const admin = await requireAdminPage();
  const owner = admin.role === "OWNER";
  const sp = await searchParams;
  const range = resolveRange(sp.period ?? "month", sp.from, sp.to);
  const r = await getReport(range);
  const s = r.summary;
  const view = sp.view === "weekly" || sp.view === "monthly" ? sp.view : "daily";
  const rows = r[view];
  const exportQs = `period=${range.preset}&from=${range.from}&to=${range.to}`;
  const fmtKey = (k: string) => (view === "monthly" ? monthLabel.format(new Date(`${k}-01T00:00:00Z`)) : view === "weekly" ? `Week of ${weekLabel.format(new Date(`${k}T00:00:00Z`))}` : weekLabel.format(new Date(`${k}T00:00:00Z`)));

  return (
    <>
      <PageHeader
        title="Reports"
        description={`${range.label}. Business dates use Addis Ababa time.`}
        actions={
          <>
            <a href={`/api/admin/export?type=sales&${exportQs}`} className="btn btn-outline btn-sm"><Download size={15} /> Sales CSV</a>
            <a href="/api/admin/export?type=inventory" className="btn btn-outline btn-sm"><Download size={15} /> Inventory CSV</a>
          </>
        }
      />
      <div className="mb-6"><PeriodFilter preset={range.preset} from={range.from} to={range.to} /></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Gross sales" value={formatETB(s.salesCents)} note={`${s.saleOrders} confirmed orders · ${s.unitsSold} units`} />
        <Stat label="Collected" value={formatETB(s.collectedCents)} note="Verified payments received" />
        <Stat label="Refunds" value={formatETB(s.refundsCents)} tone={s.refundsCents ? "danger" : undefined} />
        <Stat label="Net collected" value={formatETB(s.netCollectedCents)} note="Collected − refunds" />
      </div>

      {owner && (
        <Card title="Profit estimate" className="mt-6">
          <dl className="px-5 py-4 text-[14px] grid gap-2 max-w-xl">
            <div className="flex justify-between"><dt className="text-charcoal">Product revenue (items with known cost)</dt><dd className="tabular-nums">{formatETB(s.costedRevenueCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-charcoal">− Cost of goods</dt><dd className="tabular-nums">{formatETB(s.costOfGoodsCents)}</dd></div>
            <div className="flex justify-between font-medium border-t border-line pt-2"><dt>Estimated gross profit</dt><dd className="tabular-nums">{formatETB(s.grossProfitCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-charcoal">+ Delivery fees charged</dt><dd className="tabular-nums">{formatETB(s.deliveryFeesCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-charcoal">− Refunds</dt><dd className="tabular-nums">{formatETB(s.refundsCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-charcoal">− Expenses</dt><dd className="tabular-nums">{formatETB(s.expensesCents)}</dd></div>
            <div className={`flex justify-between font-medium border-t border-line pt-2 ${s.netProfitCents < 0 ? "text-danger" : ""}`}><dt>Estimated net operating profit</dt><dd className="tabular-nums">{formatETB(s.netProfitCents)}</dd></div>
          </dl>
          <p className="px-5 pb-4 text-[12px] text-muted leading-relaxed">
            Based on confirmed (not cancelled) orders placed in this period. Cost is the cost price saved when each order was placed.
            {s.itemsWithoutCost > 0 && <strong className="font-medium text-warning"> {s.itemsWithoutCost} of {s.totalItemLines} order lines have no cost price and are left out of profit — add cost prices to products for a complete figure.</strong>}
            {" "}Profit is an estimate on sales, not on cash collected.
          </p>
        </Card>
      )}

      <Card
        title="Sales over time"
        className="mt-6"
        actions={
          <div className="flex gap-1 text-[12px]">
            {(["daily", "weekly", "monthly"] as const).map((v) => (
              <a key={v} href={`?period=${range.preset}&from=${range.from}&to=${range.to}&view=${v}`} className={`px-2.5 h-7 inline-flex items-center rounded-xs ${view === v ? "bg-ink text-white" : "hover:bg-sand"}`}>
                {v[0].toUpperCase() + v.slice(1)}
              </a>
            ))}
          </div>
        }
      >
        {rows.length === 0 ? <p className="p-5 text-[13px] text-muted">No sales or payments in this period.</p> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Period</th><th className="num">Orders</th><th className="num">Units</th><th className="num">Sales</th><th className="num">Collected (net)</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}><td>{fmtKey(row.key)}</td><td className="num">{row.orders}</td><td className="num">{row.units}</td><td className="num">{formatETB(row.salesCents)}</td><td className="num">{formatETB(row.collectedCents)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card title="Sales by product">
          {r.byProduct.length === 0 ? <p className="p-5 text-[13px] text-muted">No confirmed sales.</p> : (
            <div className="overflow-x-auto max-h-[420px]">
              <table className="table">
                <thead className="sticky top-0 bg-surface"><tr><th>Product</th><th className="num">Units</th><th className="num">Revenue</th>{owner && <th className="num">Gross profit</th>}</tr></thead>
                <tbody>
                  {r.byProduct.map((p) => (
                    <tr key={p.name + p.category}>
                      <td>{p.name}<span className="block text-[12px] text-muted">{p.category}</span></td>
                      <td className="num">{p.units}</td>
                      <td className="num">{formatETB(p.revenueCents)}</td>
                      {owner && <td className="num">{p.costCents === null ? <span className="text-muted">No cost</span> : formatETB(p.revenueCents - p.costCents)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Sales by category">
            {r.byCategory.length === 0 ? <p className="p-5 text-[13px] text-muted">No confirmed sales.</p> : (
              <table className="table">
                <thead><tr><th>Category</th><th className="num">Units</th><th className="num">Revenue</th></tr></thead>
                <tbody>{r.byCategory.map((c) => <tr key={c.name}><td>{c.name}</td><td className="num">{c.units}</td><td className="num">{formatETB(c.revenueCents)}</td></tr>)}</tbody>
              </table>
            )}
          </Card>
          <Card title="Payment methods">
            {r.byMethod.length === 0 ? <p className="p-5 text-[13px] text-muted">No payments recorded in this period.</p> : (
              <table className="table">
                <thead><tr><th>Method</th><th className="num">Payments</th><th className="num">Collected</th><th className="num">Refunds</th></tr></thead>
                <tbody>{r.byMethod.map((m) => <tr key={m.method}><td>{PAYMENT_METHOD_LABEL[m.method]}</td><td className="num">{m.count}</td><td className="num">{formatETB(m.collectedCents)}</td><td className="num">{formatETB(m.refundsCents)}</td></tr>)}</tbody>
              </table>
            )}
          </Card>
          {owner && (
            <Card title="Expenses">
              {r.byExpense.length === 0 ? <p className="p-5 text-[13px] text-muted">No expenses recorded in this period.</p> : (
                <table className="table">
                  <thead><tr><th>Category</th><th className="num">Amount</th></tr></thead>
                  <tbody>{r.byExpense.map((e) => <tr key={e.category}><td>{EXPENSE_CATEGORY_LABEL[e.category]}</td><td className="num">{formatETB(e.amountCents)}</td></tr>)}</tbody>
                </table>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
