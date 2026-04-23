/**
 * Edge Function: send-email
 * Secure server-side proxy for Sequenzy transactional emails.
 *
 * Supported templates (slug → required variables):
 *   welcome              → firstName, loginUrl
 *   acesso-liberado      → firstName, productTitle, loginUrl, orderId?, amount?
 *   checkout-confirmado  → firstName, productTitle, orderId, amount, pixKey?, invoiceUrl?
 *   quiz-aprovado        → firstName, moduleTitle, score, passingScore, productTitle
 *   reset-senha          → firstName (Supabase sends the link — we send a companion email)
 *   curso-concluido      → firstName, productTitle, certificateUrl
 *   recovery-lembrete    → firstName, productTitle, checkoutUrl, amount
 *
 * Authentication:
 *   - `welcome` and `checkout-confirmado` are public (called from server-side flows)
 *   - All other templates require a valid Bearer token
 *
 * Security:
 *   - CORS locked to allowed origins
 *   - Origin check on every non-OPTIONS request
 *   - Template slug allowlist (prevent enumeration)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor, handleCors, isAllowedOrigin } from "../_shared/cors.ts";
import { sequenzyTransactional, sequenzyUpsertSubscriber, sequenzyEvent } from "../_shared/sequenzy.ts";

/* ── Allowlist of valid template slugs ── */
const ALLOWED_TEMPLATES = new Set([
  "welcome",
  "acesso-liberado",
  "checkout-confirmado",
  "quiz-aprovado",
  "reset-senha",
  "curso-concluido",
  "recovery-lembrete",
]);

/* ── Templates that do NOT require authentication ── */
const PUBLIC_TEMPLATES = new Set([
  "welcome",
  "checkout-confirmado",
  "recovery-lembrete",
]);

function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersFor(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

Deno.serve(async (req: Request) => {
  /* ── CORS preflight ── */
  const preflight = handleCors(req);
  if (preflight) return preflight;

  if (!isAllowedOrigin(req)) return json(req, 403, { error: "Origem não permitida" });
  if (req.method !== "POST") return json(req, 405, { error: "Método não permitido" });

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return json(req, 415, { error: "Content-Type deve ser application/json" });
  }

  /* ── Parse body ── */
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, 400, { error: "JSON inválido" });
  }

  const { to, slug, variables = {}, metadata = {} } = body as {
    to?: string;
    slug?: string;
    variables?: Record<string, string | number>;
    metadata?: Record<string, string | number | boolean>;
  };

  /* ── Validate required fields ── */
  if (!to || typeof to !== "string") return json(req, 400, { error: "Campo 'to' (email) é obrigatório" });
  if (!slug || typeof slug !== "string") return json(req, 400, { error: "Campo 'slug' do template é obrigatório" });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) return json(req, 400, { error: "Formato de e-mail inválido" });

  if (!ALLOWED_TEMPLATES.has(slug)) {
    return json(req, 400, { error: `Template '${slug}' não suportado` });
  }

  /* ── Auth check for protected templates ── */
  const supabaseUrl  = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  if (!PUBLIC_TEMPLATES.has(slug)) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(req, 401, { error: "Autenticação necessária para este template" });
    }
    const token = authHeader.replace("Bearer ", "").trim();
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return json(req, 401, { error: "Token inválido ou expirado" });
    }
    console.log(`[send-email] Authenticated request: user=${user.id} template=${slug}`);
  }

  /* ── Sequenzy API key ── */
  const sequenzyApiKey = Deno.env.get("SEQUENZY_API_KEY");
  if (!sequenzyApiKey) {
    console.error("[send-email] SEQUENZY_API_KEY not configured");
    return json(req, 500, { error: "Serviço de e-mail não configurado" });
  }

  /* ── Build final variables with safe defaults ── */
  const email = to.trim().toLowerCase();
  const firstName = (variables.firstName as string) || email.split("@")[0];
  const loginUrl = `${(Deno.env.get("PUBLIC_SITE_URL") ?? "https://despertarespiral.com").replace(/\/+$/, "")}/login`;

  const finalVars: Record<string, string | number> = {
    loginUrl,
    supportEmail: "contato@despertarespiral.com",
    year: new Date().getFullYear(),
    ...variables,
    firstName,  // always override with cleaned firstName
  };

  /* ── Fire transactional email ── */
  console.log(`[send-email] Sending '${slug}' to ${email}`);

  await sequenzyTransactional(sequenzyApiKey, email, slug, finalVars);

  /* ── Fire companion Sequenzy event for tracking + automation suppression ── */
  const EVENT_MAP: Record<string, string> = {
    "welcome":             "email.welcome_sent",
    "acesso-liberado":     "email.access_granted_sent",
    "checkout-confirmado": "email.checkout_confirmed_sent",
    "quiz-aprovado":       "email.quiz_passed_sent",
    "reset-senha":         "email.password_reset_sent",
    "curso-concluido":     "email.course_completed_sent",
    "recovery-lembrete":   "email.recovery_sent",
  };

  const trackingEvent = EVENT_MAP[slug];
  if (trackingEvent) {
    await sequenzyEvent(sequenzyApiKey, email, trackingEvent, {
      template_slug: slug,
      sent_at: new Date().toISOString(),
      ...(metadata as Record<string, string | number | boolean | null>),
    });
  }

  /* ── Upsert subscriber with last_email_sent attribute ── */
  await sequenzyUpsertSubscriber(sequenzyApiKey, {
    email,
    firstName,
    customAttributes: {
      last_email_sent:     slug,
      last_email_sent_at:  new Date().toISOString(),
    },
  });

  console.log(`[send-email] '${slug}' sent successfully to ${email}`);
  return json(req, 200, { ok: true, slug, to: email });
});
