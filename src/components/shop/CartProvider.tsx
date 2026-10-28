"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * The cart lives in the customer's browser (localStorage) so it survives
 * navigation and reloads. Prices stored here are for display only: the server
 * re-reads every price and stock level when quoting and placing the order.
 */
export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  color: string | null;
  quantity: number;
  priceCents: number;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  ready: boolean;
  add(line: CartLine): void;
  setQuantity(productId: string, color: string | null, quantity: number): void;
  remove(productId: string, color: string | null): void;
  replace(lines: CartLine[]): void;
  clear(): void;
}

const STORAGE_KEY = "shop.cart.v1";
const MAX_QTY = 20;
const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

const same = (a: { productId: string; color: string | null }, productId: string, color: string | null) =>
  a.productId === productId && (a.color ?? null) === (color ?? null);

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((l) => l && typeof l.productId === "string" && l.quantity > 0) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(load());
    setReady(true);
    // Keep several tabs in sync.
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) setLines(load()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage can be unavailable (private mode); the cart still works for this visit.
    }
  }, [lines, ready]);

  const add = useCallback((line: CartLine) => {
    setLines((prev) => {
      const existing = prev.find((l) => same(l, line.productId, line.color));
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, ...line, quantity: Math.min(MAX_QTY, l.quantity + line.quantity) } : l));
      }
      return [...prev, { ...line, quantity: Math.min(MAX_QTY, line.quantity) }];
    });
  }, []);

  const setQuantity = useCallback((productId: string, color: string | null, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => !same(l, productId, color))
        : prev.map((l) => (same(l, productId, color) ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l)),
    );
  }, []);

  const remove = useCallback((productId: string, color: string | null) => {
    setLines((prev) => prev.filter((l) => !same(l, productId, color)));
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      ready,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      add,
      setQuantity,
      remove,
      replace: setLines,
      clear: () => setLines([]),
    }),
    [lines, ready, add, setQuantity, remove],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
