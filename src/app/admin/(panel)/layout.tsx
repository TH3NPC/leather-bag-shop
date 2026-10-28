import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { getSettings } from "@/server/settings";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [admin, settings] = await Promise.all([requireAdminPage(), getSettings()]);
  return (
    <div className="min-h-dvh bg-paper">
      <AdminNav shopName={settings.shopName} adminName={admin.name} role={admin.role} />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-4 md:px-8 py-6 md:py-10">{children}</div>
      </main>
    </div>
  );
}
