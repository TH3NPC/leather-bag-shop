import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatETB } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { formatDate } from "@/lib/time";
import { Card, Empty, PageHeader } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/Pagination";

export const metadata: Metadata = { title: "Customers" };
const PAGE_SIZE = 30;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const where: Prisma.CustomerWhereInput = q
    ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q.replace(/\s/g, "").replace(/^0/, "") } }, { telegramUsername: { contains: q.replace(/^@/, ""), mode: "insensitive" } }] }
    : {};
  const total = await db.customer.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(sp.page) || 1), pageCount);
  const customers = await db.customer.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true, name: true, phone: true, telegramUsername: true, telegramId: true,
      orders: { select: { status: true, totalCents: true, createdAt: true }, orderBy: { createdAt: "desc" } },
    },
  });

  return (
    <>
      <PageHeader title="Customers" description="Only the details customers give at checkout are stored: name, phone, delivery address and, inside Telegram, their verified Telegram account." />
      <form method="get" className="flex gap-2 mb-5 max-w-md">
        <input name="q" defaultValue={q} placeholder="Name, phone or @username" className="field h-10 text-[14px]" />
        <button className="btn btn-primary btn-sm h-10">Search</button>
      </form>
      <Card>
        {customers.length === 0 ? (
          <Empty title={q ? "No customers match your search" : "No customers yet"} text={q ? undefined : "Customers are added automatically when they place an order."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Customer</th><th>Phone</th><th>Telegram</th><th className="num">Orders</th><th className="num">Completed purchases</th><th>Last order</th></tr></thead>
              <tbody>
                {customers.map((c) => {
                  const completed = c.orders.filter((o) => o.status === "COMPLETED");
                  return (
                    <tr key={c.id}>
                      <td><Link href={`/admin/customers/${c.id}`} className="hover:underline">{c.name}</Link></td>
                      <td className="whitespace-nowrap">{formatPhone(c.phone)}</td>
                      <td className="text-muted">{c.telegramUsername ? `@${c.telegramUsername}` : c.telegramId ? "Linked" : "—"}</td>
                      <td className="num">{c.orders.length}</td>
                      <td className="num">{formatETB(completed.reduce((n, o) => n + o.totalCents, 0))}</td>
                      <td className="text-muted whitespace-nowrap">{c.orders[0] ? formatDate(c.orders[0].createdAt) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Pagination page={page} pageCount={pageCount} hrefFor={(p) => `/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`} />
    </>
  );
}
