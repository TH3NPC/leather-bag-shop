import { NextResponse } from "next/server";
import { adminRoute, parseJson } from "@/lib/api";
import { stockAdjustmentSchema } from "@/lib/validation";
import { adjustStock } from "@/server/inventory";

export const POST = adminRoute(async (req, _ctx, admin) => {
  const input = await parseJson(req, stockAdjustmentSchema);
  const movement = await adjustStock(input, admin.id);
  return NextResponse.json({ stock: movement.stockAfter }, { status: 201 });
});
