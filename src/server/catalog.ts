import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const SHOP_PAGE_SIZE = 12;

const cardSelect = {
  id: true,
  name: true,
  slug: true,
  priceCents: true,
  stock: true,
  newArrival: true,
  colors: true,
  images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 2 },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

/** Products customers may see: active, in an active category. */
const visible: Prisma.ProductWhereInput = { status: "ACTIVE", category: { active: true } };

export async function getShopCategories() {
  return db.category.findMany({
    where: { active: true, products: { some: visible } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, slug: true,
      products: { where: visible, select: { images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 } }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 1 },
      _count: { select: { products: { where: visible } } },
    },
  });
}

export async function getHomeData() {
  const [featured, newArrivals, categories] = await Promise.all([
    db.product.findMany({ where: { ...visible, featured: true }, select: cardSelect, orderBy: { createdAt: "desc" }, take: 8 }),
    db.product.findMany({ where: { ...visible, newArrival: true }, select: cardSelect, orderBy: { createdAt: "desc" }, take: 8 }),
    getShopCategories(),
  ]);
  return { featured, newArrivals, categories };
}

export type SortKey = "newest" | "price_asc" | "price_desc" | "name";
const SORTS: Record<SortKey, Prisma.ProductOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }, { id: "asc" }],
  price_asc: [{ priceCents: "asc" }, { id: "asc" }],
  price_desc: [{ priceCents: "desc" }, { id: "asc" }],
  name: [{ name: "asc" }, { id: "asc" }],
};

export function parseSort(value: string | undefined): SortKey {
  return value && value in SORTS ? (value as SortKey) : "newest";
}

export async function searchProducts(opts: { q?: string; category?: string; sort: SortKey; page: number }) {
  const q = opts.q?.trim().slice(0, 80);
  const where: Prisma.ProductWhereInput = {
    ...visible,
    ...(opts.category ? { category: { slug: opts.category, active: true } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
            { colors: { has: q } },
            { category: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const total = await db.product.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));
  const page = Math.min(Math.max(1, opts.page), pageCount);
  const items = await db.product.findMany({
    where,
    select: cardSelect,
    orderBy: SORTS[opts.sort],
    skip: (page - 1) * SHOP_PAGE_SIZE,
    take: SHOP_PAGE_SIZE,
  });
  return { items, total, page, pageCount };
}

export async function getProductBySlug(slug: string) {
  const product = await db.product.findFirst({
    where: { ...visible, slug },
    select: {
      id: true, name: true, slug: true, sku: true, description: true, priceCents: true, stock: true,
      colors: true, newArrival: true, categoryId: true,
      category: { select: { name: true, slug: true } },
      images: { select: { id: true, url: true, alt: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) return null;
  const related = await db.product.findMany({
    where: { ...visible, categoryId: product.categoryId, id: { not: product.id } },
    select: cardSelect,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: 4,
  });
  return { product, related };
}
