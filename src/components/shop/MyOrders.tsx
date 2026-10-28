"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { useTelegram } from "./TelegramProvider";
import { api } from "@/lib/client";
import { formatETB } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/labels";
import { t } from "@/i18n/en";

interface MyOrder { number: string; key: string; status: OrderStatus; totalCents: number; createdAt: string; items: number }

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Addis_Ababa" });

/** Lists the Telegram user's orders. Identity is verified on the server from signed init data. */
export function MyOrders() {
  const { isTelegram, initData } = useTelegram();
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTelegram) return;
    api<{ orders: MyOrder[] }>("/api/orders/mine", { headers: { "X-Telegram-Init-Data": initData } }).then((res) => {
      if (res.ok && res.data) setOrders(res.data.orders);
      else setError(res.error ?? t.common.error);
    });
  }, [isTelegram, initData]);

  if (!isTelegram) return null;

  return (
    <section className="mb-12">
      <h1 className="display text-[34px] mb-5">{t.order.myOrders}</h1>
      {error && <p className="text-[13px] text-danger">{error}</p>}
      {orders === null && !error && <p className="text-sm text-muted">{t.common.loading}</p>}
      {orders?.length === 0 && <p className="text-sm text-muted">You have not placed any orders yet.</p>}
      {orders && orders.length > 0 && (
        <ul className="border-t border-line">
          {orders.map((o) => (
            <li key={o.number}>
              <Link href={`/order/${o.number}?key=${encodeURIComponent(o.key)}`} className="flex items-center gap-3 py-4 border-b border-line">
                <div className="flex-1">
                  <p className="text-[15px] tracking-[0.03em]">{o.number}</p>
                  <p className="text-[13px] text-muted">{dateFmt.format(new Date(o.createdAt))} · {ORDER_STATUS_LABEL[o.status]}</p>
                </div>
                <p className="text-[14px] tabular-nums">{formatETB(o.totalCents)}</p>
                <ChevronRight size={16} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
