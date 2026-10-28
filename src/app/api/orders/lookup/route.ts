import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleError, jsonError, parseJson } from "@/lib/api";
import { orderLookupSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

/** Finds an order by number + phone and returns its private access key. Rate limited against guessing. */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const limit = rateLimit(`lookup:${ip}`, 10, 10 * 60_000);
    if (!limit.ok) return jsonError("Too many attempts. Please wait a few minutes and try again.", 429);

    const { number, phone } = await parseJson(req, orderLookupSchema);
    const order = await db.order.findUnique({ where: { number }, select: { number: true, phone: true, accessKey: true } });
    if (!order || order.phone !== phone) {
      return jsonError("We couldn't find an order with that number and phone.", 404);
    }
    return NextResponse.json({ number: order.number, key: order.accessKey });
  } catch (err) {
    return handleError(err);
  }
}
