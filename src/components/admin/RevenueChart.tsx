import { formatETB } from "@/lib/money";
import type { SeriesPoint } from "@/server/reports";

/**
 * Bar chart of sales (confirmed order value) per day, with collected cash as a
 * thinner inner bar. Pure SVG, rendered on the server, no chart library.
 */
export function RevenueChart({ series }: { series: SeriesPoint[] }) {
  const max = Math.max(1, ...series.map((p) => Math.max(p.salesCents, p.collectedCents)));
  const empty = series.every((p) => p.salesCents === 0 && p.collectedCents === 0);
  const W = 720, H = 220, padL = 8, padB = 26, padT = 10;
  const innerH = H - padB - padT;
  const slot = (W - padL) / Math.max(1, series.length);
  const barW = Math.max(3, Math.min(34, slot * 0.62));
  const labelEvery = Math.ceil(series.length / 10);

  // Three gridlines at round-ish values.
  const step = niceStep(max / 3);
  const grid = [1, 2, 3].map((i) => i * step).filter((v) => v <= max * 1.05);

  return (
    <div>
      <div className="flex items-center gap-5 mb-3 text-[12px] text-charcoal">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 bg-line-strong" /> Sales (confirmed orders)</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 bg-ink" /> Collected (payments − refunds)</span>
      </div>
      {empty ? (
        <div className="h-[180px] grid place-items-center text-[13px] text-muted border border-dashed border-line">No sales or payments in this period yet.</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Daily sales and collected revenue">
          {grid.map((v) => {
            const y = padT + innerH - (v / max) * innerH;
            return (
              <g key={v}>
                <line x1={padL} x2={W} y1={y} y2={y} stroke="var(--color-line)" strokeDasharray="2 4" />
                <text x={W} y={y - 4} textAnchor="end" fontSize="10" fill="var(--color-muted)">{compact(v)}</text>
              </g>
            );
          })}
          <line x1={padL} x2={W} y1={padT + innerH} y2={padT + innerH} stroke="var(--color-line-strong)" />
          {series.map((p, i) => {
            const cx = padL + slot * i + slot / 2;
            const sh = (p.salesCents / max) * innerH;
            const ch = (Math.max(0, p.collectedCents) / max) * innerH;
            return (
              <g key={p.key}>
                <title>{`${p.label}: sales ${formatETB(p.salesCents)} (${p.orders} orders), collected ${formatETB(p.collectedCents)}`}</title>
                <rect x={cx - barW / 2} y={padT + innerH - sh} width={barW} height={sh} fill="var(--color-line-strong)" />
                <rect x={cx - barW / 6} y={padT + innerH - ch} width={Math.max(2, barW / 3)} height={ch} fill="var(--color-ink)" />
                {i % labelEvery === 0 && (
                  <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--color-muted)">{p.label}</text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

function niceStep(raw: number) {
  const pow = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

function compact(cents: number) {
  const birr = cents / 100;
  if (birr >= 1_000_000) return `${(birr / 1_000_000).toFixed(1)}M`;
  if (birr >= 1000) return `${Math.round(birr / 1000)}k`;
  return String(Math.round(birr));
}
