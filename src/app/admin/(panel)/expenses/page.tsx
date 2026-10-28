import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatETB } from "@/lib/money";
import { formatDate, resolveRange } from "@/lib/time";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/labels";
import { Card, Empty, PageHeader, Stat } from "@/components/admin/ui";
import { PeriodFilter } from "@/components/admin/PeriodFilter";
import { ExpenseForm, DeleteExpenseButton } from "@/components/admin/ExpenseForm";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  await requireAdminPage("OWNER");
  const sp = await searchParams;
  const range = resolveRange(sp.period ?? "month", sp.from, sp.to);
  const expenses = await db.expense.findMany({
    where: { date: { gte: range.gte, lt: range.lt } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { admin: { select: { name: true } } },
  });
  const total = expenses.reduce((n, e) => n + e.amountCents, 0);

  return (
    <>
      <PageHeader title="Expenses" description="Optional. Shop costs recorded here are subtracted in the net operating profit estimate on the Reports page." />
      <div className="mb-6"><PeriodFilter preset={range.preset} from={range.from} to={range.to} /></div>
      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="space-y-6">
          <Stat label={`Expenses · ${range.label}`} value={formatETB(total)} note={`${expenses.length} ${expenses.length === 1 ? "entry" : "entries"}`} />
          <Card>
            {expenses.length === 0 ? <Empty title="No expenses in this period" /> : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Date</th><th>Category</th><th>Description</th><th className="num">Amount</th><th /></tr></thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id}>
                        <td className="whitespace-nowrap text-muted">{formatDate(e.date)}</td>
                        <td>{EXPENSE_CATEGORY_LABEL[e.category]}</td>
                        <td>{e.description}{e.admin && <span className="block text-[12px] text-muted">by {e.admin.name}</span>}</td>
                        <td className="num">{formatETB(e.amountCents)}</td>
                        <td className="text-right"><DeleteExpenseButton id={e.id} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
        <ExpenseForm />
      </div>
    </>
  );
}
