import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

/** Shop settings are a single row; it is created with defaults on first use. */
export const getSettings = cache(async () => {
  return db.shopSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
});

export type ShopSettingsData = Awaited<ReturnType<typeof getSettings>>;
