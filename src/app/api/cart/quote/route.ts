import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handleError, jsonError, parseJson } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  items: z.array(z.object({ productId: z.string().min(1).max(40), color: z.string().max(40).nullable().optional(), quantity: z.number().int().min(1).max(20) })).max(30),
});

/** Returns current server prices and stock for the items in a customer's cart. */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
    if (!rateLimit(`quote:${ip}`, 120, 60_000).ok) return jsonError("Too many requests. Please wait a moment.", 429);

    const { items } = await parseJson(req, schema);
    const products = await db.product.findMany({
      where: { id: { in: [...new Set(items.map((i) => i.productId))] } },
      select: {
        id: true, name: true, slug: true, priceCents: true, stock: true, colors: true, status: true,
        category: { select: { active: true } },
        images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines = items.map((i) => {
      const p = byId.get(i.productId);
      const available = !!p && p.status === "ACTIVE" && p.category.active && p.stock > 0;
      const colorValid = !p || p.colors.length === 0 || (!!i.color && p.colors.includes(i.color));
      return {
        productId: i.productId,
        color: i.color ?? null,
        name: p?.name ?? null,
        slug: p?.slug ?? null,
        image: p?.images[0]?.url ?? null,
        priceCents: p?.priceCents ?? null,
        stock: p && available ? p.stock : 0,
        available: available && colorValid,
      };
    });
    return NextResponse.json({ lines });
  } catch (err) {
    return handleError(err);
  }
}
