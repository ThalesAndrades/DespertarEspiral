/**
 * In-memory sliding-window rate limiter for Edge Functions.
 *
 * Limitation: state lives per-instance. On Supabase Edge Runtime each isolate
 * is ephemeral and may handle multiple requests, so this provides best-effort
 * burst protection. For stronger guarantees back with an upstream KV store.
 */

type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= max) {
    const oldest = bucket.hits[0];
    const retryAfterMs = Math.max(0, windowMs - (now - oldest));
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  // Opportunistic cleanup — prevent unbounded growth
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      if (b.hits.every((t) => now - t > windowMs)) buckets.delete(k);
    }
  }

  return { allowed: true, remaining: max - bucket.hits.length, retryAfterMs: 0 };
}

export function clientKey(req: Request, extra?: string): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  return extra ? `${ip}:${extra}` : ip;
}
