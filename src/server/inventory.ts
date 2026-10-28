import "server-only";
import { db } from "@/lib/db";
import { AppError } from "@/lib/api";

export interface StockAdjustment {
  productId: string;
  type: "RESTOCK" | "CORRECTION" | "DAMAGED";
  /** RESTOCK: units added. DAMAGED: units removed. CORRECTION: the new counted stock level. */
  quantity: number;
  reason: string;
}

/** Applies a manual stock change atomically and records it in the movement history. */
export async function adjustStock(input: StockAdjustment, adminId: string) {
  return db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: input.productId }, select: { id: true, stock: true, name: true } });
    if (!product) throw new AppError("Product not found.", 404);

    let change: number;
    if (input.type === "RESTOCK") {
      if (input.quantity <= 0) throw new AppError("Enter how many units arrived.", 422, { quantity: "Must be at least 1" });
      change = input.quantity;
    } else if (input.type === "DAMAGED") {
      if (input.quantity <= 0) throw new AppError("Enter how many units to remove.", 422, { quantity: "Must be at least 1" });
      change = -input.quantity;
    } else {
      change = input.quantity - product.stock;
      if (change === 0) throw new AppError("The counted stock is the same as the current stock.", 422, { quantity: "No change" });
    }

    // Conditional update so a concurrent order cannot push stock below zero.
    const res = await tx.product.updateMany({
      where: { id: product.id, stock: input.type === "CORRECTION" ? product.stock : change < 0 ? { gte: -change } : undefined },
      data: { stock: { increment: change } },
    });
    if (res.count === 0) {
      throw new AppError(
        input.type === "CORRECTION"
          ? "Stock changed while you were editing (probably a new order). Please reload and count again."
          : `Cannot remove more than the ${product.stock} units in stock.`,
        409,
      );
    }
    const updated = await tx.product.findUniqueOrThrow({ where: { id: product.id }, select: { stock: true } });
    return tx.inventoryMovement.create({
      data: { productId: product.id, type: input.type, change, stockAfter: updated.stock, reason: input.reason, adminId },
    });
  });
}
