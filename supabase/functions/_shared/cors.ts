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
  "https://www.despertarespiral.com",
];

// OnSpace preview & publish domains (*.onspace.app)
const ONSPACE_ORIGIN_RE = /^https:\/\/[\w-]+\.onspace\.app$/;

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
  const isAllowed =
    origin &&
    (allowed.includes(origin) || ONSPACE_ORIGIN_RE.test(origin));
  const allowOrigin = isAllowed ? origin! : allowed[0];

  return {
    ...baseCorsHeaders,
    "Access-Control-Allow-Origin": allowOrigin ?? "https://despertarespiral.com",
    Vary: "Origin",
  };
}

export function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients (webhooks, server-to-server)
  return getAllowedOrigins().includes(origin) || ONSPACE_ORIGIN_RE.test(origin);
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeadersFor(req) });
  }
  return null;
}
