// Simple fixed-window rate limiter kept in memory.
// Suitable for a single server process. If the app is ever scaled to several
// instances, move this to a shared store (e.g. Redis or the database).

interface Bucket { count: number; resetAt: number }

const globalStore = globalThis as unknown as { __rateLimit?: Map<string, Bucket> };
const buckets = (globalStore.__rateLimit ??= new Map());

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return { ok: true, retryAfter: 0 };
  }
  bucket.count += 1;
  return { ok: bucket.count <= limit, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
