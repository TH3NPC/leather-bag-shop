import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug } from "@/server/catalog";
import { formatETB } from "@/lib/money";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { AddToCart } from "@/components/shop/AddToCart";
import { ProductRail } from "@/components/shop/ProductCard";
import { t } from "@/i18n/en";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await getProductBySlug((await params).slug);
  return data ? { title: data.product.name, description: data.product.description.slice(0, 150) } : {};
}

export default async function ProductPage({ params }: { params: Params }) {
  const data = await getProductBySlug((await params).slug);
  if (!data) notFound();
  const { product, related } = data;

  return (
    <div className="mx-auto max-w-6xl md:px-6 md:pt-8 pb-12">
      <div className="md:grid md:grid-cols-[1.15fr_1fr] md:gap-12 lg:gap-16">
        <ProductGallery images={product.images} name={product.name} />

        <div className="px-4 md:px-0 pt-6 md:pt-2">
          <nav className="text-[12px] text-muted mb-3" aria-label="Breadcrumb">
            <Link href="/shop" className="hover:text-ink">{t.nav.shop}</Link>
            <span className="mx-1.5">/</span>
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-ink">{product.category.name}</Link>
          </nav>
          <h1 className="display text-[34px] md:text-[44px] text-balance">{product.name}</h1>
          <p className="mt-3 text-[20px] text-ink tabular-nums">{formatETB(product.priceCents)}</p>

          <div className="mt-7">
            <AddToCart
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                priceCents: product.priceCents,
                stock: product.stock,
                colors: product.colors,
                image: product.images[0]?.url ?? null,
              }}
            />
          </div>

          <div className="mt-9 pt-7 border-t border-line">
            <h2 className="eyebrow mb-3">Details</h2>
            <div className="text-[15px] leading-relaxed text-charcoal whitespace-pre-line">{product.description}</div>
            {product.sku && <p className="mt-5 text-[12px] text-muted">Product code: {product.sku}</p>}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="px-4 md:px-0 mt-14 md:mt-24">
          <h2 className="display text-[28px] md:text-[34px] mb-5 md:mb-7">{t.product.related}</h2>
          <ProductRail products={related} />
        </section>
      )}
    </div>
  );
}
