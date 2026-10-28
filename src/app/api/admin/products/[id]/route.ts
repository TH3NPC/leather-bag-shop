import { NextResponse } from "next/server";
import { adminRoute, parseJson } from "@/lib/api";
import { productSchema } from "@/lib/validation";
import { deleteOrArchiveProduct, updateProduct } from "@/server/products";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = adminRoute<Ctx>(async (req, { params }, admin) => {
  const { id } = await params;
  const input = await parseJson(req, productSchema);
  await updateProduct(id, input, admin.id);
  return NextResponse.json({ ok: true });
});

export const DELETE = adminRoute<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  return NextResponse.json(await deleteOrArchiveProduct(id));
});
