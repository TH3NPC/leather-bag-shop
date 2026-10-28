"use client";

import { Minus, Plus } from "lucide-react";

export function QuantityStepper({
  value, min = 1, max, onChange, size = "md", label = "Quantity",
}: { value: number; min?: number; max: number; onChange(v: number): void; size?: "sm" | "md"; label?: string }) {
  const h = size === "sm" ? "h-9" : "h-12";
  const w = size === "sm" ? "w-9" : "w-12";
  return (
    <div className={`inline-flex items-stretch border border-line-strong rounded-xs bg-surface ${h}`} role="group" aria-label={label}>
      <button type="button" className={`${w} grid place-items-center text-ink disabled:text-faint`} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity">
        <Minus size={16} strokeWidth={1.6} />
      </button>
      <span className="min-w-8 px-1 grid place-items-center text-[15px] tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className={`${w} grid place-items-center text-ink disabled:text-faint`} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Plus size={16} strokeWidth={1.6} />
      </button>
    </div>
  );
}
