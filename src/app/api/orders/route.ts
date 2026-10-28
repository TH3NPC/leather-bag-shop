import { NextResponse } from "next/server";
import { handleError, jsonError, parseJson } from "@/lib/api";
import { checkoutSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { telegramConfigured, verifyInitData } from "@/lib/telegram";
import { createOrder } from "@/server/orders";

/** Places an order. Prices, stock and the customer's Telegram identity are all determined on the server. */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const limit = rateLimit(`order:${ip}`, 8, 10 * 60_000);
    if (!limit.ok) return jsonError(`Too many orders from this device. Please try again in ${Math.ceil(limit.retryAfter / 60)} minutes.`, 429);

    const input = await parseJson(req, checkoutSchema);

    // Telegram identity is trusted only if the signed init data verifies with our bot token.
    const initData = req.headers.get("x-telegram-init-data");
    const telegramUser = initData ? verifyInitData(initData) : null;
    if (initData && telegramConfigured() && !telegramUser) {
      return jsonError("Your Telegram session has expired. Please close and reopen the shop from the bot.", 401);
    }

    const order = await createOrder(input, telegramUser);
    return NextResponse.json({ number: order.number, key: order.accessKey }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
