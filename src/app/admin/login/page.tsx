import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentAdmin } from "@/lib/auth";
import { getSettings } from "@/server/settings";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Sign in · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");
  const settings = await getSettings();
  return (
    <div className="min-h-dvh grid place-items-center px-4 py-12 bg-paper">
      <div className="w-full max-w-sm">
        <p className="font-display text-3xl text-center">{settings.shopName}</p>
        <p className="eyebrow text-center mt-2 mb-8">Shop admin</p>
        <div className="bg-surface border border-line p-6">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-[12px] text-muted">Accounts are created by the shop owner. There is no public sign-up.</p>
      </div>
    </div>
  );
}
