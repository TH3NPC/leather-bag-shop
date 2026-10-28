import "server-only";
import type { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/api";
import { uniqueSlug } from "@/lib/slug";
import type { productCreateSchema, productSchema } from "@/lib/validation";

type ProductInput = z.output<typeof productSchema>;
type ProductCreateInput = z.output<typeof productCreateSchema>;

async function assertCategory(categoryId: string) {
  const exists = await db.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!exists) throw new AppError("Choose a valid category.", 422, { categoryId: "Invalid category" });
}

const imageRows = (images: ProductInput["images"], name: string) =>
  images.map((img, i) => ({ url: img.url, alt: img.alt || name, sortOrder: i }));

export async function createProduct(input: ProductCreateInput, adminId: string) {
  await assertCategory(input.categoryId);
  const slug = await uniqueSlug(input.name, async (s) => !!(await db.product.findUnique({ where: { slug: s }, select: { id: true } })));
  return db.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: input.name, slug, sku: input.sku, description: input.description,
        priceCents: input.price, costCents: input.cost, categoryId: input.categoryId,
        colors: [...new Set(input.colors)], stock: input.initialStock, lowStockThreshold: input.lowStockThreshold,
        status: input.status, featured: input.featured, newArrival: input.newArrival,
        images: { create: imageRows(input.images, input.name) },
        priceHistory: { create: { priceCents: input.price, costCents: input.cost, changedById: adminId } },
      },
    });
    if (input.initialStock > 0) {
      await tx.inventoryMovement.create({
        data: { productId: product.id, type: "INITIAL", change: input.initialStock, stockAfter: input.initialStock, reason: "Opening stock", adminId },
      });
    }
    return product;
  });
}

/**
 * Updates product details. Stock is NOT edited here (use inventory adjustments).
 * Price changes are logged; existing orders keep the prices saved on their items.
 */
export async function updateProduct(id: string, input: ProductInput, adminId: string) {
  await assertCategory(input.categoryId);
  return db.$transaction(async (tx) => {
    const current = await tx.product.findUnique({ where: { id }, include: { images: true } });
    if (!current) throw new AppError("Product not found.", 404);

    const product = await tx.product.update({
      where: { id },
      data: {
        name: input.name, sku: input.sku, description: input.description,
        priceCents: input.price, costCents: input.cost, categoryId: input.categoryId,
        colors: [...new Set(input.colors)], lowStockThreshold: input.lowStockThreshold,
        status: input.status, featured: input.featured, newArrival: input.newArrival,
      },
    });

    if (current.priceCents !== input.price || current.costCents !== input.cost) {
      await tx.productPriceHistory.create({ data: { productId: id, priceCents: input.price, costCents: input.cost, changedById: adminId } });
    }

    await tx.productImage.deleteMany({ where: { productId: id } });
    await tx.productImage.createMany({ data: imageRows(input.images, input.name).map((r) => ({ ...r, productId: id })) });

    // Remove uploaded files that are no longer used anywhere (order snapshots included).
    const kept = new Set(input.images.map((i) => i.url));
    for (const img of current.images) {
      if (kept.has(img.url) || !img.url.startsWith("/media/")) continue;
      const stillUsed = await tx.productImage.count({ where: { url: img.url } }) + await tx.orderItem.count({ where: { imageUrl: img.url } });
      if (!stillUsed) await tx.mediaFile.deleteMany({ where: { id: img.url.slice("/media/".length) } });
    }
    return product;
  });
}

/** Deletes a product that was never ordered; otherwise archives it to keep order history intact. */
export async function deleteOrArchiveProduct(id: string) {
  const product = await db.product.findUnique({ where: { id }, select: { id: true, _count: { select: { orderItems: true } } } });
  if (!product) throw new AppError("Product not found.", 404);
  if (product._count.orderItems > 0) {
    await db.product.update({ where: { id }, data: { status: "ARCHIVED", featured: false, newArrival: false } });
    return { archived: true };
  }
  await db.product.delete({ where: { id } });
  return { archived: false };
}
