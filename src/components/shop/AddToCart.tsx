"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useCart } from "./CartProvider";
import { useTelegram } from "./TelegramProvider";
import { QuantityStepper } from "./QuantityStepper";
import { t } from "@/i18n/en";

interface Props {
  product: { id: string; slug: string; name: string; priceCents: number; stock: number; colors: string[]; image: string | null };
}

export function AddToCart({ product }: Props) {
  const cart = useCart();
  const { haptic } = useTelegram();
  const [color, setColor] = useState<string | null>(product.colors.length === 1 ? product.colors[0] : null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const soldOut = product.stock <= 0;
  const inCart = cart.lines.filter((l) => l.productId === product.id).reduce((n, l) => n + l.quantity, 0);
  const available = Math.max(0, product.stock - inCart);
  const max = Math.max(1, Math.min(available, 20));

  const add = () => {
    setError(null);
    if (product.colors.length > 0 && !color) {
      setError(t.product.chooseColor);
      return;
    }
    if (available <= 0) {
      setError(t.product.maxReached);
      return;
    }
    cart.add({
      productId: product.id, slug: product.slug, name: product.name, image: product.image,
      color, quantity: Math.min(qty, available), priceCents: product.priceCents,
    });
    haptic("success");
    setAdded(true);
    setQty(1);
  };

  return (
    <div>
      {product.colors.length > 0 && (
        <fieldset className="mb-6">
          <legend className="eyebrow mb-3">
            {t.product.color}{color && <span className="normal-case tracking-normal text-charcoal font-normal">: {color}</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setColor(c); setError(null); setAdded(false); }}
                className={`h-10 px-4 text-[14px] border rounded-xs transition-colors ${color === c ? "border-ink bg-ink text-white" : "border-line-strong text-charcoal hover:border-ink"}`}
                aria-pressed={color === c}
              >
                {c}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <p className={`mb-4 text-[13px] ${soldOut ? "text-danger" : product.stock <= 3 ? "text-leather" : "text-success"}`}>
        {soldOut ? t.product.soldOut : product.stock <= 3 ? t.product.onlyLeft(product.stock) : t.product.inStock}
      </p>

      {!soldOut && (
        <div className="flex gap-3">
          <QuantityStepper value={Math.min(qty, max)} max={max} onChange={(v) => { setQty(v); setAdded(false); }} />
          <button type="button" onClick={add} className="btn btn-primary flex-1" disabled={available <= 0}>
            {t.product.addToCart}
          </button>
        </div>
      )}

      {error && <p className="field-error" role="alert">{error}</p>}

      {added && (
        <div className="mt-4 flex items-center justify-between gap-3 border border-line bg-surface px-4 py-3 text-[14px]" role="status">
          <span className="flex items-center gap-2 text-ink"><Check size={16} className="text-success" /> {t.product.added}</span>
          <Link href="/cart" className="underline underline-offset-4 text-ink">{t.product.viewCart}</Link>
        </div>
      )}
    </div>
  );
}
