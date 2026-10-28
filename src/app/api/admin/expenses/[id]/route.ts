import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminRoute } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = adminRoute<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  await db.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}, { role: "OWNER" });
