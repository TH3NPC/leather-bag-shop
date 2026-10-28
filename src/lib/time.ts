// Business dates are in Addis Ababa time (UTC+3, no daylight saving).
// Reports group and filter by the local calendar day, not the server's timezone.

export const SHOP_TIMEZONE = "Africa/Addis_Ababa";
const OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" of the given instant in Addis Ababa. */
export function dayKey(date: Date): string {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** UTC instant at which the given Addis calendar day ("YYYY-MM-DD") starts. */
export function startOfDay(key: string): Date {
  return new Date(Date.parse(`${key}T00:00:00.000Z`) - OFFSET_MS);
}

export function addDays(key: string, days: number): string {
  return dayKey(new Date(startOfDay(key).getTime() + days * DAY_MS));
}

export function isValidDayKey(key: string | undefined | null): key is string {
  return !!key && /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(Date.parse(`${key}T00:00:00Z`));
}

export type PeriodPreset = "today" | "7d" | "month" | "last_month" | "custom";

export interface DateRange {
  preset: PeriodPreset;
  /** Inclusive first day, "YYYY-MM-DD". */
  from: string;
  /** Inclusive last day, "YYYY-MM-DD". */
  to: string;
  /** UTC instants for database queries: [gte, lt). */
  gte: Date;
  lt: Date;
  label: string;
}

const labelFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const formatKey = (key: string) => labelFmt.format(new Date(`${key}T00:00:00Z`));

/** Resolves a period preset (or custom from/to) into an Addis-local date range. */
export function resolveRange(preset?: string, fromParam?: string, toParam?: string, now = new Date()): DateRange {
  const today = dayKey(now);
  const [y, m] = today.split("-").map(Number);
  const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;
  let from = today;
  let to = today;
  let p: PeriodPreset = "today";

  switch (preset) {
    case "7d":
      p = "7d"; from = addDays(today, -6); break;
    case "month":
      p = "month"; from = monthStart; break;
    case "last_month": {
      p = "last_month";
      to = addDays(monthStart, -1);
      from = `${to.slice(0, 7)}-01`;
      break;
    }
    case "custom":
      if (isValidDayKey(fromParam) && isValidDayKey(toParam)) {
        p = "custom";
        [from, to] = fromParam <= toParam ? [fromParam, toParam] : [toParam, fromParam];
      }
      break;
  }

  const labels: Record<PeriodPreset, string> = {
    today: "Today",
    "7d": "Last 7 days",
    month: "This month",
    last_month: "Last month",
    custom: from === to ? formatKey(from) : `${formatKey(from)} – ${formatKey(to)}`,
  };

  return { preset: p, from, to, gte: startOfDay(from), lt: startOfDay(addDays(to, 1)), label: labels[p] };
}

/** Every day key in the range, inclusive. */
export function daysInRange(range: Pick<DateRange, "from" | "to">): string[] {
  const days: string[] = [];
  for (let k = range.from; k <= range.to; k = addDays(k, 1)) days.push(k);
  return days;
}

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: SHOP_TIMEZONE,
});
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: SHOP_TIMEZONE });

export const formatDateTime = (d: Date | string) => dateTimeFmt.format(new Date(d));
export const formatDate = (d: Date | string) => dateFmt.format(new Date(d));
