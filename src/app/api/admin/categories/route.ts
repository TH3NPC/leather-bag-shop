import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminRoute, parseJson } from "@/lib/api";
import { categorySchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/slug";

export const POST = adminRoute(async (req) => {
  const input = await parseJson(req, categorySchema);
  const slug = await uniqueSlug(input.name, async (s) => !!(await db.category.findUnique({ where: { slug: s }, select: { id: true } })));
  const category = await db.category.create({ data: { ...input, slug } });
  return NextResponse.json({ id: category.id }, { status: 201 });
});
