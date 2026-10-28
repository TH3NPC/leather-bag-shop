import { z } from "zod";
import { normalizeEthiopianPhone } from "./phone";
import { parseETB } from "./money";
import { EXPENSE_CATEGORIES, MANUAL_PAYMENT_METHODS, ORDER_STATUSES, PAYMENT_METHODS } from "./labels";

// Strips control characters and trims. React escapes output, so this is about clean data, not XSS.
const clean = (max: number) =>
  z.string().transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim()).pipe(z.string().max(max, `Must be ${max} characters or fewer`));

const requiredText = (max: number, label: string) => clean(max).pipe(z.string().min(1, `${label} is required`));
const optionalText = (max: number) => clean(max).optional().nullable().transform((v) => (v ? v : null));

export const phoneSchema = z
  .string()
  .transform((v, ctx) => {
    const p = normalizeEthiopianPhone(v);
    if (!p) {
      ctx.addIssue({ code: "custom", message: "Enter a valid Ethiopian mobile number, e.g. 0911 234 567" });
      return z.NEVER;
    }
    return p;
  });

/** Accepts "2,500", "2500.50" or a number of birr; outputs santim. */
export const etbSchema = z.union([z.string(), z.number()]).transform((v, ctx) => {
  const cents = parseETB(v);
  if (cents === null) {
    ctx.addIssue({ code: "custom", message: "Enter an amount in birr, e.g. 2500" });
    return z.NEVER;
  }
  return cents;
});

const optionalEtb = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const cents = parseETB(v);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Enter an amount in birr, e.g. 1200" });
      return z.NEVER;
    }
    return cents;
  });

// ---------- Checkout ----------

export const checkoutSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.string().min(1).max(40),
          color: optionalText(40),
          quantity: z.number().int().min(1).max(20),
        }),
      )
      .min(1, "Your cart is empty")
      .max(30),
    name: requiredText(80, "Name"),
    phone: phoneSchema,
    fulfillment: z.enum(["DELIVERY", "PICKUP"]),
    address: optionalText(300),
    landmark: optionalText(200),
    notes: optionalText(500),
    paymentMethod: z.enum(MANUAL_PAYMENT_METHODS as [string, ...string[]]),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillment === "DELIVERY" && !v.address) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "Delivery address is required" });
    }
  });

export const orderLookupSchema = z.object({
  number: requiredText(30, "Order number").transform((s) => s.toUpperCase()),
  phone: phoneSchema,
});

// ---------- Admin: auth ----------

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
  password: z.string().min(1, "Password is required").max(200),
});

// ---------- Admin: products ----------

export const productSchema = z.object({
  name: requiredText(120, "Name"),
  sku: optionalText(40),
  description: requiredText(4000, "Description"),
  price: etbSchema.pipe(z.number().int().min(100, "Price must be at least ETB 1").max(100_000_000)),
  cost: optionalEtb,
  categoryId: z.string().min(1, "Choose a category"),
  colors: z.array(requiredText(40, "Color")).max(12).default([]),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000).default(3),
  status: z.enum(["ACTIVE", "UNAVAILABLE", "ARCHIVED"]),
  featured: z.boolean().default(false),
  newArrival: z.boolean().default(false),
  images: z
    .array(z.object({ url: z.string().min(1).max(500), alt: clean(200).default("") }))
    .max(8)
    .default([]),
});

/** On creation only: opening stock. Later changes go through inventory adjustments. */
export const productCreateSchema = productSchema.extend({
  initialStock: z.coerce.number().int().min(0).max(100_000).default(0),
});

export const categorySchema = z.object({
  name: requiredText(60, "Name"),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  active: z.boolean().default(true),
});

// ---------- Admin: orders ----------

export const statusChangeSchema = z.object({
  status: z.enum(ORDER_STATUSES as [string, ...string[]]),
  note: optionalText(300),
});

export const paymentSchema = z.object({
  kind: z.enum(["PAYMENT", "REFUND"]),
  method: z.enum(PAYMENT_METHODS as [string, ...string[]]),
  amount: etbSchema.pipe(z.number().int().min(1, "Amount must be greater than zero")),
  reference: optionalText(100),
  note: optionalText(300),
  receivedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ---------- Admin: inventory ----------

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(["RESTOCK", "CORRECTION", "DAMAGED"]),
  // RESTOCK: positive quantity added. DAMAGED: positive quantity removed. CORRECTION: the new counted stock.
  quantity: z.coerce.number().int().min(0).max(100_000),
  reason: requiredText(200, "Reason"),
});

// ---------- Admin: expenses ----------

export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES as [string, ...string[]]),
  amount: etbSchema.pipe(z.number().int().min(1, "Amount must be greater than zero")),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  description: requiredText(200, "Description"),
});

// ---------- Admin: settings ----------

export const settingsSchema = z.object({
  shopName: requiredText(60, "Shop name"),
  tagline: clean(120),
  heroTitle: requiredText(100, "Headline"),
  heroSubtitle: clean(240),
  heroImageUrl: optionalText(500),
  promoActive: z.boolean(),
  promoTitle: clean(80),
  promoText: clean(240),
  contactPhone: clean(30),
  pickupAddress: clean(300),
  deliveryFee: etbSchema,
  deliveryNote: clean(200),
  paymentMethods: z.array(z.enum(MANUAL_PAYMENT_METHODS as [string, ...string[]])).min(1, "Enable at least one payment method"),
  bankDetails: clean(500),
  telebirrDetails: clean(300),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000),
});
