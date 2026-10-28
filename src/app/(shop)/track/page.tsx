import type { Metadata } from "next";
import { TrackForm } from "@/components/shop/TrackForm";
import { MyOrders } from "@/components/shop/MyOrders";
import { t } from "@/i18n/en";

export const metadata: Metadata = { title: "Orders" };

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-md px-4 pt-8 md:pt-12 pb-16">
      {/* Shown only inside Telegram, after the server verifies the user. */}
      <MyOrders />
      <h1 className="display text-[34px] mb-2">{t.order.track}</h1>
      <p className="text-sm text-muted mb-6">{t.order.trackText}</p>
      <TrackForm />
    </div>
  );
}
