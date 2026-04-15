/**
 * CORS helper (Supabase Edge Functions)
 *
 * Security notes:
 * - Avoid wildcard origins in production.
 * - Keep an allow-list via env: ALLOWED_ORIGINS="https://a.com,https://b.com"
 * - Use Vary: Origin to prevent cache poisoning across origins.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:8080",
  "https://despertarespiral.com",
];

function getAllowedOrigins(): string[] {
  const raw = (Deno.env.get("ALLOWED_ORIGINS") ?? "").trim();
  const fromEnv = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : DEFAULT_ALLOWED_ORIGINS;
}

const baseCorsHeaders: Record<string, string> = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sequenzy-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed = getAllowedOrigins();
  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0];

  return {
    ...baseCorsHeaders,
    "Access-Control-Allow-Origin": allowOrigin ?? "https://despertarespiral.com",
    Vary: "Origin",
  };
}

export function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients
  return getAllowedOrigins().includes(origin);
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeadersFor(req) });
  }
  return null;
}
