import { NextResponse } from "next/server";
import type { ExpenseCategory } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, adminRoute, parseJson } from "@/lib/api";
import { expenseSchema } from "@/lib/validation";
import { dayKey, startOfDay } from "@/lib/time";

export const POST = adminRoute(async (req, _ctx, admin) => {
  const input = await parseJson(req, expenseSchema);
  if (input.date > dayKey(new Date())) throw new AppError("Expense date cannot be in the future.", 422, { date: "In the future" });
  const expense = await db.expense.create({
    data: {
      category: input.category as ExpenseCategory,
      amountCents: input.amount,
      // Stored at noon Addis time so the calendar day is unambiguous.
      date: new Date(startOfDay(input.date).getTime() + 12 * 3600_000),
      description: input.description,
      adminId: admin.id,
    },
  });
  return NextResponse.json({ id: expense.id }, { status: 201 });
}, { role: "OWNER" });
