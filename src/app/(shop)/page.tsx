import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getHomeData } from "@/server/catalog";
import { getSettings } from "@/server/settings";
import { ProductRail } from "@/components/shop/ProductCard";
import { t } from "@/i18n/en";

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-end justify-between mb-5 md:mb-7">
      <h2 className="display text-[28px] md:text-[36px]">{title}</h2>
      {href && (
        <Link href={href} className="text-[13px] text-charcoal underline underline-offset-4 decoration-line-strong hover:decoration-ink">
          {t.home.viewAll}
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  const [settings, { featured, newArrivals, categories }] = await Promise.all([getSettings(), getHomeData()]);

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl md:px-6 md:pt-6">
        <div className="relative md:grid md:grid-cols-[1.05fr_1fr] md:bg-surface md:border md:border-line">
          <div className="relative aspect-[4/3.6] md:aspect-auto md:min-h-[520px] md:order-2 bg-sand">
            {settings.heroImageUrl && (
              <Image src={settings.heroImageUrl} alt="" fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            )}
          </div>
          <div className="px-5 pt-7 pb-9 md:p-12 lg:p-16 flex flex-col justify-center">
            {settings.tagline && <p className="eyebrow mb-4">{settings.tagline}</p>}
            <h1 className="display text-[40px] sm:text-[48px] lg:text-[60px] text-ink text-balance">{settings.heroTitle}</h1>
            {settings.heroSubtitle && <p className="mt-4 text-[15px] md:text-base leading-relaxed text-charcoal max-w-md">{settings.heroSubtitle}</p>}
            <div className="mt-7">
              <Link href="/shop" className="btn btn-primary w-full sm:w-auto">
                {t.home.shopCollection}
                <ArrowRight size={18} strokeWidth={1.6} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 md:px-6 mt-12 md:mt-20">
          <SectionHeader title={t.home.categories} />
          <div className="-mx-4 px-4 md:mx-0 md:px-0 flex md:grid md:grid-cols-6 gap-3 md:gap-4 overflow-x-auto no-scrollbar snap-x scroll-px-4 md:scroll-px-0">
            {categories.map((c) => {
              const cover = c.products[0]?.images[0]?.url;
              return (
                <Link key={c.id} href={`/shop?category=${c.slug}`} className="group w-[38%] sm:w-[26%] md:w-auto shrink-0 snap-start">
                  <div className="relative aspect-square bg-sand overflow-hidden">
                    {cover && <Image src={cover} alt="" fill sizes="(min-width: 768px) 16vw, 38vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />}
                  </div>
                  <p className="mt-2.5 text-[14px] text-ink">{c.name}</p>
                  <p className="text-[12px] text-muted">{c._count.products} {c._count.products === 1 ? "item" : "items"}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 md:px-6 mt-12 md:mt-20">
          <SectionHeader title={t.home.featured} href="/shop" />
          <ProductRail products={featured.slice(0, 4)} />
        </section>
      )}

      {/* Promotion (editable in admin settings) */}
      {settings.promoActive && settings.promoTitle && (
        <section className="mx-auto max-w-6xl px-4 md:px-6 mt-12 md:mt-20">
          <div className="bg-ink text-white px-6 py-9 md:px-12 md:py-12 md:flex md:items-center md:justify-between md:gap-10">
            <div>
              <p className="eyebrow !text-white/60 mb-3">From the workshop</p>
              <h2 className="display text-[30px] md:text-[40px]">{settings.promoTitle}</h2>
              {settings.promoText && <p className="mt-3 text-[15px] text-white/75 max-w-xl leading-relaxed">{settings.promoText}</p>}
            </div>
            <Link href="/shop" className="btn bg-white text-ink hover:bg-sand mt-6 md:mt-0 shrink-0 w-full md:w-auto">
              {t.home.shopCollection}
            </Link>
          </div>
        </section>
      )}

      {newArrivals.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 md:px-6 mt-12 md:mt-20 mb-12">
          <SectionHeader title={t.home.newArrivals} href="/shop?sort=newest" />
          <ProductRail products={newArrivals.slice(0, 4)} />
        </section>
      )}
    </>
  );
}
