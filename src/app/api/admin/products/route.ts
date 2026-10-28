import { NextResponse } from "next/server";
import { adminRoute, parseJson } from "@/lib/api";
import { productCreateSchema } from "@/lib/validation";
import { createProduct } from "@/server/products";

export const POST = adminRoute(async (req, _ctx, admin) => {
  const input = await parseJson(req, productCreateSchema);
  const product = await createProduct(input, admin.id);
  return NextResponse.json({ id: product.id }, { status: 201 });
});
