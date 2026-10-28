import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AppError, adminRoute, parseJson } from "@/lib/api";
import { categorySchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = adminRoute<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const input = await parseJson(req, categorySchema);
  // The slug stays the same so existing links keep working.
  await db.category.update({ where: { id }, data: input });
  return NextResponse.json({ ok: true });
});

export const DELETE = adminRoute<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  const count = await db.product.count({ where: { categoryId: id } });
  if (count > 0) throw new AppError(`This category still has ${count} product${count === 1 ? "" : "s"}. Move them to another category or hide the category instead.`, 409);
  await db.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
