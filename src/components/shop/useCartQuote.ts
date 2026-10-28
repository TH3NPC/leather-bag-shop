"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCart, type CartLine } from "./CartProvider";

export interface QuotedLine extends CartLine {
  available: boolean;
  stock: number;
  /** Set when the server changed something the customer should notice. */
  notice: "unavailable" | "reduced" | "price" | null;
}

/**
 * Asks the server for current prices and stock, updates the local cart to match,
 * and returns lines annotated with what changed.
 */
export function useCartQuote() {
  const cart = useCart();
  const [quoted, setQuoted] = useState<QuotedLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const linesRef = useRef(cart.lines);
  linesRef.current = cart.lines;

  const key = cart.lines.map((l) => `${l.productId}:${l.color}:${l.quantity}`).join("|");

  const refresh = useCallback(async () => {
    const lines = linesRef.current;
    if (lines.length === 0) { setQuoted([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cart/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines.map((l) => ({ productId: l.productId, color: l.color, quantity: l.quantity })) }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not check your cart.");
      const data: { lines: { productId: string; color: string | null; name: string | null; slug: string | null; image: string | null; priceCents: number | null; stock: number; available: boolean }[] } = await res.json();

      const next: QuotedLine[] = lines.map((line, i) => {
        const q = data.lines[i];
        if (!q || !q.available || q.priceCents === null) return { ...line, available: false, stock: 0, notice: "unavailable" };
        const quantity = Math.min(line.quantity, q.stock);
        const notice = quantity < line.quantity ? "reduced" : q.priceCents !== line.priceCents ? "price" : null;
        return {
          ...line,
          name: q.name ?? line.name,
          slug: q.slug ?? line.slug,
          image: q.image ?? line.image,
          priceCents: q.priceCents,
          quantity,
          available: true,
          stock: q.stock,
          notice,
        };
      });
      setQuoted(next);

      // Persist server corrections (price, name, reduced quantity) into the cart.
      const changed = next.some((n, i) => n.priceCents !== lines[i].priceCents || n.quantity !== lines[i].quantity || n.name !== lines[i].name);
      if (changed) {
        cart.replace(next.map(({ available: _a, stock: _s, notice: _n, ...line }) => line));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check your cart.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cart.ready) return;
    const id = setTimeout(refresh, 150);
    return () => clearTimeout(id);
  }, [key, cart.ready, refresh]);

  const usable = (quoted ?? []).filter((l) => l.available && l.quantity > 0);
  const subtotalCents = usable.reduce((n, l) => n + l.priceCents * l.quantity, 0);

  return { quoted, usable, subtotalCents, loading, error, refresh };
}
