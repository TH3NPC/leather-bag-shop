import type { Metadata } from "next";
import { getSettings } from "@/server/settings";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { MANUAL_PAYMENT_METHODS } from "@/lib/labels";
import { t } from "@/i18n/en";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 pt-6 md:pt-10 pb-16">
      <h1 className="display text-[34px] md:text-[48px] mb-6">{t.checkout.title}</h1>
      <CheckoutForm
        settings={{
          deliveryFeeCents: s.deliveryFeeCents,
          deliveryNote: s.deliveryNote,
          pickupAddress: s.pickupAddress,
          paymentMethods: s.paymentMethods.filter((m) => MANUAL_PAYMENT_METHODS.includes(m)),
        }}
      />
    </div>
  );
}
