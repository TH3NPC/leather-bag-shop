"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// Minimal typing for the parts of window.Telegram.WebApp we use.
interface TgWebApp {
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name?: string; last_name?: string; username?: string } };
  version: string;
  platform: string;
  ready(): void;
  expand(): void;
  isVersionAtLeast(v: string): boolean;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  setBottomBarColor?(color: string): void;
  disableVerticalSwipes?(): void;
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
  HapticFeedback?: { impactOccurred(style: "light" | "medium"): void; notificationOccurred(type: "success" | "error"): void };
}

declare global {
  interface Window { Telegram?: { WebApp?: TgWebApp } }
}

interface TelegramContextValue {
  /** True only when running inside a Telegram client (init data present). */
  isTelegram: boolean;
  /** Raw init data. Sent to the server, which verifies its signature. */
  initData: string;
  /** Unverified display name for prefilling forms. Never used for identity. */
  displayName: string;
  haptic(kind: "light" | "success" | "error"): void;
}

const TelegramContext = createContext<TelegramContextValue>({ isTelegram: false, initData: "", displayName: "", haptic: () => {} });

export const useTelegram = () => useContext(TelegramContext);

const BRAND_BG = "#f6f3ee";

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({ isTelegram: false, initData: "", displayName: "" });
  const webApp = useRef<TgWebApp | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const depth = useRef(0);

  useEffect(() => {
    // The SDK script loads asynchronously; poll briefly for it.
    let tries = 0;
    const timer = setInterval(() => {
      const tg = window.Telegram?.WebApp;
      if (tg || ++tries > 40) clearInterval(timer);
      if (!tg || !tg.initData) return;
      webApp.current = tg;
      tg.ready();
      tg.expand();
      try {
        tg.setHeaderColor(BRAND_BG);
        tg.setBackgroundColor(BRAND_BG);
        if (tg.isVersionAtLeast("7.10")) tg.setBottomBarColor?.(BRAND_BG);
        // Prevents the Mini App closing while the customer scrolls a long page (Android).
        if (tg.isVersionAtLeast("7.7")) tg.disableVerticalSwipes?.();
      } catch {
        // Older clients do not support every method; the app works without them.
      }
      const u = tg.initDataUnsafe.user;
      setState({ isTelegram: true, initData: tg.initData, displayName: [u?.first_name, u?.last_name].filter(Boolean).join(" ") });
      document.documentElement.dataset.telegram = "true";
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Native back button: visible on every page except home.
  useEffect(() => {
    depth.current += 1;
    const tg = webApp.current;
    if (!tg || !state.isTelegram) return;
    const onBack = () => {
      if (depth.current > 1 && window.history.length > 1) router.back();
      else router.push("/");
    };
    if (pathname === "/") tg.BackButton.hide();
    else tg.BackButton.show();
    tg.BackButton.onClick(onBack);
    return () => tg.BackButton.offClick(onBack);
  }, [pathname, router, state.isTelegram]);

  const value = useMemo<TelegramContextValue>(
    () => ({
      ...state,
      haptic: (kind) => {
        const h = webApp.current?.HapticFeedback;
        if (!h) return;
        if (kind === "light") h.impactOccurred("light");
        else h.notificationOccurred(kind);
      },
    }),
    [state],
  );

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}
