/**
 * Demonstration catalog. Safe to run more than once (upserts by slug).
 * All products use SKUs starting with "DEMO-" so the owner can recognise and
 * replace them. Photography: Unsplash (https://unsplash.com/license).
 * No orders, customers or admin accounts are created here.
 */
import "dotenv/config";
import { PrismaClient, type ProductStatus } from "@prisma/client";

const db = new PrismaClient();

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`;

const categories = [
  { name: "Handbags", slug: "handbags", sortOrder: 1 },
  { name: "Tote bags", slug: "tote-bags", sortOrder: 2 },
  { name: "Shoulder bags", slug: "shoulder-bags", sortOrder: 3 },
  { name: "Backpacks", slug: "backpacks", sortOrder: 4 },
  { name: "Wallets & accessories", slug: "wallets-accessories", sortOrder: 5 },
  { name: "Other bags", slug: "other-bags", sortOrder: 6 },
];

interface SeedProduct {
  name: string;
  slug: string;
  sku: string;
  category: string;
  price: number; // ETB
  cost: number | null; // ETB, null = unknown
  colors: string[];
  stock: number;
  featured?: boolean;
  newArrival?: boolean;
  status?: ProductStatus;
  images: string[];
  description: string;
}

const products: SeedProduct[] = [
  {
    name: "Selam Top-Handle Bag", slug: "selam-top-handle-bag", sku: "DEMO-HB-001", category: "handbags",
    price: 6800, cost: 3400, colors: ["Cognac", "Black"], stock: 8, featured: true,
    images: ["photo-1624687943971-e86af76d57de", "photo-1691480150204-66dd1eb77391"],
    description: "A structured top-handle bag in vegetable-tanned full-grain leather. One main compartment with a zip pocket for your phone and keys, and a detachable shoulder strap for hands-free days.\n\nApprox. 28 × 20 × 11 cm. Brass hardware. Cotton-lined interior.",
  },
  {
    name: "Lalibela Structured Handbag", slug: "lalibela-structured-handbag", sku: "DEMO-HB-002", category: "handbags",
    price: 8500, cost: 4300, colors: ["Tan", "Chocolate"], stock: 5, featured: true, newArrival: true,
    images: ["photo-1691480250099-a63081ecfcb8", "photo-1657603738389-951c374b740c"],
    description: "Clean lines and a firm base that keeps its shape. Hand-stitched edges, burnished by hand. Two inner slip pockets and a magnetic closure.\n\nApprox. 30 × 22 × 12 cm. Fits a small tablet.",
  },
  {
    name: "Entoto Mini Handbag", slug: "entoto-mini-handbag", sku: "DEMO-HB-003", category: "handbags",
    price: 4900, cost: 2300, colors: ["Ivory", "Black"], stock: 2, newArrival: true,
    images: ["photo-1604176424472-17cd740f74e9"],
    description: "A compact everyday handbag for the essentials: phone, cards, keys and a small wallet. Smooth leather with a soft structure.\n\nApprox. 22 × 15 × 8 cm.",
  },
  {
    name: "Merkato Everyday Tote", slug: "merkato-everyday-tote", sku: "DEMO-TB-001", category: "tote-bags",
    price: 5600, cost: 2700, colors: ["Brown", "Black"], stock: 12, featured: true,
    images: ["photo-1571254165288-99dd71f0e352"],
    description: "Our hardest-working tote. Thick, supple leather that softens with use, long handles that sit comfortably on the shoulder, and room for a laptop up to 14\".\n\nApprox. 38 × 32 × 12 cm. Inner zip pocket.",
  },
  {
    name: "Bole Shopper Tote", slug: "bole-shopper-tote", sku: "DEMO-TB-002", category: "tote-bags",
    price: 7200, cost: 3500, colors: ["Camel", "Olive", "Chocolate"], stock: 6, newArrival: true,
    images: ["photo-1760624294582-5341f33f9fa4", "photo-1760624294504-211e763ee0fb"],
    description: "A generous, unlined shopper cut from a single hide panel. Open top with a snap closure, reinforced handle joins.\n\nApprox. 42 × 34 × 14 cm.",
  },
  {
    name: "Harar Soft Tote", slug: "harar-soft-tote", sku: "DEMO-TB-003", category: "tote-bags",
    price: 6200, cost: null, colors: ["Tan"], stock: 4,
    images: ["photo-1654707636750-ab67a11b21b7"],
    description: "Slouchy and light, in a soft milled leather. Folds flat for travel.\n\nApprox. 36 × 30 × 10 cm.",
  },
  {
    name: "Abay Saddle Bag", slug: "abay-saddle-bag", sku: "DEMO-SB-001", category: "shoulder-bags",
    price: 5900, cost: 2800, colors: ["Cognac"], stock: 7, featured: true,
    images: ["photo-1637759292654-a12cb2be085e"],
    description: "A rounded saddle bag with an adjustable long strap, worn on the shoulder or across the body. Flap closure with a hidden magnet.\n\nApprox. 24 × 19 × 7 cm.",
  },
  {
    name: "Gondar Satchel", slug: "gondar-satchel", sku: "DEMO-SB-002", category: "shoulder-bags",
    price: 7800, cost: 3900, colors: ["Brown", "Grey"], stock: 3, newArrival: true,
    images: ["photo-1473188588951-666fce8e7c68", "photo-1605733513597-a8f8341084e6"],
    description: "A classic buckled satchel with a top handle and shoulder strap. Two front pockets and a roomy main compartment for documents.\n\nApprox. 34 × 26 × 10 cm.",
  },
  {
    name: "Simien Sling Bag", slug: "simien-sling-bag", sku: "DEMO-SB-003", category: "shoulder-bags",
    price: 3800, cost: 1700, colors: ["Black"], stock: 10,
    images: ["photo-1603219527847-24c87f552a77"],
    description: "A slim sling for phone, wallet and keys. Wear it across the chest or on the hip.\n\nApprox. 26 × 16 × 5 cm. YKK zip.",
  },
  {
    name: "Axum Leather Backpack", slug: "axum-leather-backpack", sku: "DEMO-BP-001", category: "backpacks",
    price: 9400, cost: 4600, colors: ["Cognac", "Dark brown"], stock: 5, featured: true,
    images: ["photo-1622560480605-d83c853bc5c3", "photo-1622560482379-c9813322e95a"],
    description: "A full-grain backpack built for daily commuting. Padded laptop sleeve (15\"), front zip pocket, and padded leather straps.\n\nApprox. 42 × 30 × 14 cm.",
  },
  {
    name: "Tana Day Pack", slug: "tana-day-pack", sku: "DEMO-BP-002", category: "backpacks",
    price: 7600, cost: 3700, colors: ["Brown and black"], stock: 6,
    images: ["photo-1549943872-f7ff0b2b51be"],
    description: "A lighter day pack with a drawstring top and buckled flap. Two-tone leather.\n\nApprox. 38 × 28 × 13 cm.",
  },
  {
    name: "Arat Kilo Bucket Backpack", slug: "arat-kilo-bucket-backpack", sku: "DEMO-BP-003", category: "backpacks",
    price: 6900, cost: 3300, colors: ["Tan"], stock: 0, newArrival: true,
    images: ["photo-1577733966973-d680bffd2e80"],
    description: "A small bucket-shaped backpack that converts to a shoulder bag. Drawstring closure with a leather toggle.\n\nApprox. 30 × 24 × 14 cm.",
  },
  {
    name: "Classic Bifold Wallet", slug: "classic-bifold-wallet", sku: "DEMO-WA-001", category: "wallets-accessories",
    price: 1800, cost: 750, colors: ["Brown", "Black"], stock: 25, featured: true,
    images: ["photo-1624538000860-24716b9050f2"],
    description: "Six card slots, two note compartments and nothing extra. Slim enough for a front pocket.\n\nApprox. 11 × 9 cm folded.",
  },
  {
    name: "Slim Card Holder", slug: "slim-card-holder", sku: "DEMO-WA-002", category: "wallets-accessories",
    price: 1200, cost: 450, colors: ["Tan", "Black"], stock: 30, newArrival: true,
    images: ["photo-1614330316567-11d8e572db16"],
    description: "Four card slots and a centre pocket for folded notes. Hand-stitched with waxed thread.\n\nApprox. 10 × 7 cm.",
  },
  {
    name: "Key & Coin Pouch", slug: "key-and-coin-pouch", sku: "DEMO-WA-003", category: "wallets-accessories",
    price: 950, cost: 380, colors: ["Brown"], stock: 18,
    images: ["photo-1758798689719-5b554ac3b65a"],
    description: "A small zip pouch with a key ring. Keeps coins, keys and earphones together.\n\nApprox. 11 × 8 cm.",
  },
  {
    name: "Long Wallet", slug: "long-wallet", sku: "DEMO-WA-004", category: "wallets-accessories",
    price: 2400, cost: 1050, colors: ["Black"], stock: 9,
    images: ["photo-1579014134953-1580d7f123f3"],
    description: "A long wallet that keeps notes flat. Ten card slots, a zip coin section and room for a phone.\n\nApprox. 19 × 10 cm.",
  },
  {
    name: "Weekender Duffel", slug: "weekender-duffel", sku: "DEMO-OB-001", category: "other-bags",
    price: 12500, cost: 6200, colors: ["Black"], stock: 3,
    images: ["photo-1758542988969-39a10168b2ce"],
    description: "A two-night travel bag in heavy full-grain leather with a detachable shoulder strap and brass feet to protect the base.\n\nApprox. 50 × 28 × 26 cm.",
  },
  {
    name: "Executive Document Bag", slug: "executive-document-bag", sku: "DEMO-OB-002", category: "other-bags",
    price: 8900, cost: 4400, colors: ["Black"], stock: 4,
    images: ["photo-1709898838174-83c3e155654c"],
    description: "A slim document bag for the office. Holds A4 folders and a 14\" laptop. Top handle and shoulder strap.\n\nApprox. 39 × 29 × 7 cm.",
  },
];

async function main() {
  const catIds = new Map<string, string>();
  for (const c of categories) {
    const row = await db.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
    catIds.set(c.slug, row.id);
  }

  let created = 0;
  // Created in reverse so the first listed product is the "newest".
  for (const p of [...products].reverse()) {
    const exists = await db.product.findUnique({ where: { slug: p.slug }, select: { id: true } });
    if (exists) continue;
    await db.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          description: p.description,
          priceCents: p.price * 100,
          costCents: p.cost === null ? null : p.cost * 100,
          categoryId: catIds.get(p.category)!,
          colors: p.colors,
          stock: p.stock,
          lowStockThreshold: 3,
          status: p.status ?? "ACTIVE",
          featured: p.featured ?? false,
          newArrival: p.newArrival ?? false,
          images: { create: p.images.map((id, i) => ({ url: img(id), alt: p.name, sortOrder: i })) },
          priceHistory: { create: { priceCents: p.price * 100, costCents: p.cost === null ? null : p.cost * 100 } },
        },
      });
      if (p.stock > 0) {
        await tx.inventoryMovement.create({
          data: { productId: product.id, type: "INITIAL", change: p.stock, stockAfter: p.stock, reason: "Demo catalog opening stock" },
        });
      }
    });
    created++;
  }

  await db.shopSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      shopName: "Leather Atelier",
      tagline: "Handcrafted leather goods · Addis Ababa",
      heroTitle: "Leather made to be carried for years",
      heroSubtitle: "Full-grain bags and small goods, cut and stitched by hand. Delivered across Addis Ababa.",
      heroImageUrl: img("photo-1760624089496-01ae68a92d58"),
      promoActive: true,
      promoTitle: "Free initials on any bag",
      promoText: "Add your initials in the order notes and we will hand-stamp them before delivery.",
      contactPhone: "",
      pickupAddress: "Pickup location to be confirmed by the shop after your order.",
      deliveryFeeCents: 15000,
      deliveryNote: "Delivery within Addis Ababa, usually within 1–2 days.",
      paymentMethods: ["CASH_ON_DELIVERY", "BANK_TRANSFER", "TELEBIRR"],
      bankDetails: "Bank details will be shared by the shop after confirming your order.",
      telebirrDetails: "The shop will send its Telebirr merchant number after confirming your order.",
      lowStockThreshold: 3,
    },
  });

  console.log(`[seed] Categories: ${categories.length}. New demo products: ${created} (of ${products.length}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
