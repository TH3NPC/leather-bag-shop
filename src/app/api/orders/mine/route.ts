import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleError, jsonError } from "@/lib/api";
import { verifyInitData } from "@/lib/telegram";

/** Lists the orders of the Telegram user whose signed init data is supplied. */
export async function GET(req: Request) {
  try {
    const user = verifyInitData(req.headers.get("x-telegram-init-data"));
    if (!user) return jsonError("Open the shop from Telegram to see your orders.", 401);
    const orders = await db.order.findMany({
      where: { customer: { telegramId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { number: true, accessKey: true, status: true, totalCents: true, createdAt: true, _count: { select: { items: true } } },
    });
    return NextResponse.json({
      orders: orders.map((o) => ({ number: o.number, key: o.accessKey, status: o.status, totalCents: o.totalCents, createdAt: o.createdAt, items: o._count.items })),
    });
  } catch (err) {
    return handleError(err);
  }
}
