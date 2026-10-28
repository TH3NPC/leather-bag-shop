"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3, Boxes, ExternalLink, FileText, LayoutDashboard, LogOut, Menu, Package, Receipt, Settings, Tags, Users, Wallet, X,
} from "lucide-react";
import { api } from "@/lib/client";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/expenses", label: "Expenses", icon: Wallet, owner: true },
  { href: "/admin/settings", label: "Settings", icon: Settings, owner: true },
];

export function AdminNav({ shopName, adminName, role }: { shopName: string; adminName: string; role: "OWNER" | "STAFF" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await api("/api/admin/auth/logout", { body: {} });
    router.replace("/admin/login");
    router.refresh();
  };

  const items = ITEMS.filter((i) => !i.owner || role === "OWNER");
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label="Admin">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 h-10 px-3 text-[14px] rounded-xs transition-colors ${isActive(href) ? "bg-ink text-white" : "text-charcoal hover:bg-sand"}`}
          aria-current={isActive(href) ? "page" : undefined}
        >
          <Icon size={17} strokeWidth={1.6} />
          {label}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="mt-auto pt-6 border-t border-line space-y-1">
      <Link href="/" target="_blank" className="flex items-center gap-3 h-10 px-3 text-[14px] text-charcoal hover:bg-sand rounded-xs">
        <ExternalLink size={17} strokeWidth={1.6} /> View shop
      </Link>
      <button onClick={logout} className="w-full flex items-center gap-3 h-10 px-3 text-[14px] text-charcoal hover:bg-sand rounded-xs">
        <LogOut size={17} strokeWidth={1.6} /> Sign out
      </button>
      <p className="px-3 pt-2 text-[12px] text-muted truncate">{adminName} · {role === "OWNER" ? "Owner" : "Staff"}</p>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center justify-between bg-surface border-b border-line no-print">
        <span className="font-display text-xl">{shopName}</span>
        <button onClick={() => setOpen(true)} className="size-10 grid place-items-center" aria-label="Open menu"><Menu size={20} /></button>
      </header>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 no-print">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-surface p-4 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <span className="font-display text-xl">{shopName}</span>
              <button onClick={() => setOpen(false)} className="size-10 grid place-items-center" aria-label="Close menu"><X size={20} /></button>
            </div>
            {nav}
            {footer}
          </div>
        </div>
      )}
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 bg-surface border-r border-line p-4 flex-col no-print">
        <div className="px-3 pt-2 pb-7">
          <p className="font-display text-2xl leading-none">{shopName}</p>
          <p className="eyebrow mt-2 flex items-center gap-1.5"><FileText size={11} /> Admin</p>
        </div>
        {nav}
        {footer}
      </aside>
    </>
  );
}
