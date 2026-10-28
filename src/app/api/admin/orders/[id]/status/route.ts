import { NextResponse } from "next/server";
import type { OrderStatus } from "@prisma/client";
import { adminRoute, parseJson } from "@/lib/api";
import { statusChangeSchema } from "@/lib/validation";
import { changeOrderStatus } from "@/server/orders";

type Ctx = { params: Promise<{ id: string }> };

export const POST = adminRoute<Ctx>(async (req, { params }, admin) => {
  const { id } = await params;
  const { status, note } = await parseJson(req, statusChangeSchema);
  const order = await changeOrderStatus(id, status as OrderStatus, admin.id, note);
  return NextResponse.json({ status: order.status });
});
