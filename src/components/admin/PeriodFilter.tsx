"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom" },
];

export function PeriodFilter({ preset, from, to }: { preset: string; from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [custom, setCustom] = useState(preset === "custom");
  const [range, setRange] = useState({ from, to });

  const go = (next: Record<string, string>) => {
    const p = new URLSearchParams(params.toString());
    for (const k of ["period", "from", "to", "page"]) p.delete(k);
    for (const [k, v] of Object.entries(next)) p.set(k, v);
    router.push(`${pathname}?${p.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 no-print">
      <div className="inline-flex flex-wrap border border-line-strong rounded-xs bg-surface overflow-hidden">
        {PRESETS.map((p) => {
          const active = p.value === "custom" ? custom : !custom && preset === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => (p.value === "custom" ? setCustom(true) : (setCustom(false), go({ period: p.value })))}
              className={`h-9 px-3.5 text-[13px] border-r border-line last:border-r-0 transition-colors ${active ? "bg-ink text-white" : "text-charcoal hover:bg-sand"}`}
              aria-pressed={active}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {custom && (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); go({ period: "custom", from: range.from, to: range.to }); }}
        >
          <label className="sr-only" htmlFor="from">From</label>
          <input id="from" type="date" className="field h-9 w-auto text-[13px]" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} required />
          <span className="text-muted text-sm">to</span>
          <label className="sr-only" htmlFor="to">To</label>
          <input id="to" type="date" className="field h-9 w-auto text-[13px]" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} required />
          <button className="btn btn-primary btn-sm">Apply</button>
        </form>
      )}
    </div>
  );
}
