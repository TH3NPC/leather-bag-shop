import { NextResponse } from "next/server";
import type { PaymentMethod } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminRoute, parseJson } from "@/lib/api";
import { settingsSchema } from "@/lib/validation";

const schema = settingsSchema.extend({
  heroImageUrl: z.string().max(500).regex(/^(\/media\/[a-z0-9]+|https:\/\/images\.unsplash\.com\/[\w\-./?=&%]+)$/, "Invalid image").nullable(),
});

export const PUT = adminRoute(async (req) => {
  const { deliveryFee, paymentMethods, ...rest } = await parseJson(req, schema);
  await db.shopSettings.upsert({
    where: { id: 1 },
    update: { ...rest, deliveryFeeCents: deliveryFee, paymentMethods: paymentMethods as PaymentMethod[] },
    create: { id: 1, ...rest, deliveryFeeCents: deliveryFee, paymentMethods: paymentMethods as PaymentMethod[] },
  });
  return NextResponse.json({ ok: true });
}, { role: "OWNER" });
