import Script from "next/script";
import type { Metadata } from "next";
import { CartProvider } from "@/components/shop/CartProvider";
import { TelegramProvider } from "@/components/shop/TelegramProvider";
import { BottomNav, ShopHeader } from "@/components/shop/ShopChrome";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: { default: s.shopName, template: `%s · ${s.shopName}` }, description: s.tagline };
}

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      {/* Telegram Mini App SDK. Harmless in a normal browser. */}
      <Script src="https://telegram.org/js/telegram-web-app.js?59" strategy="afterInteractive" />
      <TelegramProvider>
        <CartProvider>
          <ShopHeader shopName={settings.shopName} />
          <main className="pb-[calc(58px+env(safe-area-inset-bottom,0px))] md:pb-0">{children}</main>
          <footer className="hidden md:block border-t border-line mt-24">
            <div className="mx-auto max-w-6xl px-6 py-10 flex items-end justify-between gap-6 text-sm text-muted">
              <div>
                <p className="font-display text-2xl text-ink">{settings.shopName}</p>
                <p className="mt-1">{settings.tagline}</p>
              </div>
              {settings.contactPhone && <p>{settings.contactPhone}</p>}
            </div>
          </footer>
          <BottomNav />
        </CartProvider>
      </TelegramProvider>
    </>
  );
}
