import type { Metadata } from "next";
import { CartView } from "@/components/shop/CartView";
import { t } from "@/i18n/en";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 pt-6 md:pt-10 pb-12">
      <h1 className="display text-[34px] md:text-[48px] mb-6">{t.cart.title}</h1>
      <CartView />
    </div>
  );
}
