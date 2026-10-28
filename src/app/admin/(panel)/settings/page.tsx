import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { centsToInput } from "@/lib/money";
import { telegramConfigured } from "@/lib/telegram";
import { getSettings } from "@/server/settings";
import { Card, PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdminPage("OWNER");
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Settings" description="Shop identity, home page content, delivery and payment options." />
      <SettingsForm
        initial={{
          shopName: s.shopName, tagline: s.tagline, heroTitle: s.heroTitle, heroSubtitle: s.heroSubtitle, heroImageUrl: s.heroImageUrl ?? "",
          promoActive: s.promoActive, promoTitle: s.promoTitle, promoText: s.promoText,
          contactPhone: s.contactPhone, pickupAddress: s.pickupAddress, deliveryFee: centsToInput(s.deliveryFeeCents), deliveryNote: s.deliveryNote,
          paymentMethods: s.paymentMethods, bankDetails: s.bankDetails, telebirrDetails: s.telebirrDetails, lowStockThreshold: String(s.lowStockThreshold),
        }}
      />
      <Card title="Integrations" className="mt-6">
        <dl className="px-5 py-4 text-[14px] grid gap-3">
          <div className="flex justify-between gap-4"><dt>Telegram bot (order notifications, Mini App sign-in)</dt><dd className={telegramConfigured() ? "text-success" : "text-warning"}>{telegramConfigured() ? "Configured" : "Not configured"}</dd></div>
          <div className="flex justify-between gap-4"><dt>Admin notification chat</dt><dd className={process.env.TELEGRAM_ADMIN_CHAT_ID ? "text-success" : "text-warning"}>{process.env.TELEGRAM_ADMIN_CHAT_ID ? "Configured" : "Not configured"}</dd></div>
          <div className="flex justify-between gap-4"><dt>Chapa online payments</dt><dd className="text-muted">Not integrated</dd></div>
          <div className="flex justify-between gap-4"><dt>Telebirr API payments</dt><dd className="text-muted">Not integrated (manual transfers only)</dd></div>
        </dl>
        <p className="px-5 pb-4 text-[12px] text-muted">Tokens and secrets are set as server environment variables and are never shown here.</p>
      </Card>
    </>
  );
}
