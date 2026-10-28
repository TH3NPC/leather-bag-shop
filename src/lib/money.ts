// Money is stored as integer santim (1 ETB = 100 santim).

const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const fractional = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Formats santim as "ETB 2,500" (or "ETB 2,500.50" when there are santim). */
export function formatETB(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const value = abs % 100 === 0 ? whole.format(abs / 100) : fractional.format(abs / 100);
  return `${negative ? "-" : ""}ETB ${value}`;
}

/** Plain number for inputs and CSV, e.g. 250050 -> "2500.50". */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/** Parses "2,500" / "2500.5" into santim. Returns null when invalid. */
export function parseETB(input: string | number): number | null {
  const raw = typeof input === "number" ? String(input) : input.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const [birr, santim = ""] = raw.split(".");
  return Number(birr) * 100 + Number(santim.padEnd(2, "0"));
}
