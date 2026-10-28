import { NextResponse } from "next/server";
import type { PaymentKind, PaymentMethod } from "@prisma/client";
import { adminRoute, parseJson } from "@/lib/api";
import { paymentSchema } from "@/lib/validation";
import { recordPayment } from "@/server/orders";

type Ctx = { params: Promise<{ id: string }> };

/** Records a manually verified payment or a refund. */
export const POST = adminRoute<Ctx>(async (req, { params }, admin) => {
  const { id } = await params;
  const input = await parseJson(req, paymentSchema);
  const payment = await recordPayment(
    id,
    {
      kind: input.kind as PaymentKind,
      method: input.method as PaymentMethod,
      amountCents: input.amount,
      reference: input.reference,
      note: input.note,
      receivedAt: input.receivedAt,
    },
    admin.id,
  );
  return NextResponse.json({ id: payment.id }, { status: 201 });
});
