import Image from "next/image";
import Link from "next/link";
import { formatETB } from "@/lib/money";
import type { ProductCardData } from "@/server/catalog";
import { t } from "@/i18n/en";

export function StockTag({ stock, newArrival }: { stock: number; newArrival?: boolean }) {
  if (stock <= 0) return <span className="tag bg-ink text-white">{t.product.soldOut}</span>;
  if (stock <= 3) return <span className="tag bg-surface text-leather">{t.product.onlyLeft(stock)}</span>;
  if (newArrival) return <span className="tag bg-surface text-ink">{t.product.new}</span>;
  return null;
}

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const image = product.images[0];
  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] bg-sand overflow-hidden">
        {image && (
          <Image
            src={image.url}
            alt={image.alt || product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className={`object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] ${product.stock <= 0 ? "opacity-70" : ""}`}
            priority={priority}
          />
        )}
        <div className="absolute left-2 top-2">
          <StockTag stock={product.stock} newArrival={product.newArrival} />
        </div>
      </div>
      <div className="pt-3 pb-1">
        <h3 className="text-[14px] md:text-[15px] leading-snug text-ink line-clamp-2">{product.name}</h3>
        <p className="mt-1 text-[14px] text-charcoal tabular-nums">{formatETB(product.priceCents)}</p>
      </div>
    </Link>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductCardData[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-7 md:gap-x-6 md:gap-y-10">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}

/** Horizontally scrolling row on phones, grid on larger screens. */
export function ProductRail({ products }: { products: ProductCardData[] }) {
  return (
    <div className="-mx-4 px-4 md:mx-0 md:px-0 flex md:grid md:grid-cols-4 gap-3 md:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-px-4 md:scroll-px-0">
      {products.map((p) => (
        <div key={p.id} className="w-[44%] sm:w-[30%] md:w-auto shrink-0 snap-start">
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}
