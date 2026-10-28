"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, LayoutGrid, Search, ShoppingBag, Receipt } from "lucide-react";
import { useCart } from "./CartProvider";
import { t } from "@/i18n/en";

const NAV = [
  { href: "/", label: t.nav.home, icon: House },
  { href: "/shop", label: t.nav.shop, icon: LayoutGrid },
  { href: "/cart", label: t.nav.cart, icon: ShoppingBag },
  { href: "/track", label: t.nav.orders, icon: Receipt },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/shop") return pathname.startsWith("/shop") || pathname.startsWith("/product");
  if (href === "/track") return pathname.startsWith("/track") || pathname.startsWith("/order");
  return pathname.startsWith(href);
}

function CartCount({ className = "" }: { className?: string }) {
  const { count, ready } = useCart();
  if (!ready || count === 0) return null;
  return (
    <span className={`absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-leather text-white text-[10px] font-semibold tabular-nums ${className}`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function ShopHeader({ shopName }: { shopName: string }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur-[2px] border-b border-line">
      <div className="mx-auto max-w-6xl h-14 md:h-16 px-4 md:px-6 flex items-center justify-between gap-4">
        <Link href="/" className="font-display text-[22px] md:text-[26px] leading-none tracking-[-0.01em] text-ink truncate">
          {shopName}
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-[14px]" aria-label="Main">
          {NAV.slice(0, 2).concat(NAV[3]).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors ${isActive(pathname, item.href) ? "text-ink" : "text-muted hover:text-ink"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <Link href="/shop?focus=search" className="size-10 grid place-items-center text-ink hover:bg-sand rounded-xs" aria-label={t.nav.search}>
            <Search size={20} strokeWidth={1.6} />
          </Link>
          <Link href="/cart" className="relative size-10 grid place-items-center text-ink hover:bg-sand rounded-xs" aria-label={t.nav.cart}>
            <span className="relative">
              <ShoppingBag size={20} strokeWidth={1.6} />
              <CartCount />
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/checkout")) return null;
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-line pb-safe" aria-label="Main">
      <ul className="grid grid-cols-4 h-[58px]">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`h-full flex flex-col items-center justify-center gap-1 text-[11px] tracking-[0.02em] ${active ? "text-ink font-medium" : "text-muted"}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="relative">
                  <Icon size={21} strokeWidth={active ? 1.9 : 1.5} />
                  {href === "/cart" && <CartCount />}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
