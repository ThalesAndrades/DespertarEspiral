/**
 * Edge Function: sequenzy-event
 * Secure server-side proxy so the frontend can fire Sequenzy events
 * without exposing the SEQUENZY_API_KEY client-side.
 *
 * POST body: { email, event, properties?, firstName?, customAttributes? }
 *
 * Authenticated requests (Authorization header) are validated —
 * anonymous requests for public events (lead.optin, checkout.started, etc.) are allowed.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor, handleCors } from "../_shared/cors.ts";
import {
  sequenzyUpsertSubscriber,
  sequenzyEvent,
  sequenzyTags,
  sequenzyBatch,
} from "../_shared/sequenzy.ts";

/* Events that do not require authentication (public lifecycle events) */
const PUBLIC_EVENTS = new Set([
  "lead.optin",
  "lead.optin.pain_proposito",
  "lead.optin.pain_dinheiro",
  "lead.optin.pain_relacionamentos",
  "lead.optin.pain_ansiedade",
  "lead.diagnostic_completed",
  "checkout.started",
  "checkout_iniciado",
  "high_ticket.application_submitted",
  "contact.subscribed",
]);

/* Tag mappings per event */
const EVENT_TAGS: Record<string, { add: string[]; remove: string[] }> = {
  "user.registered":                  { add: ["cadastro-realizado", "novo-usuario", "plataforma-despertar"], remove: ["visitante"] },
  "user.password_reset_requested":    { add: ["recuperacao-senha-solicitada"], remove: [] },
  "user.password_reset_completed":    { add: ["senha-redefinida"], remove: ["recuperacao-senha-solicitada"] },
  "checkout.started":                 { add: ["checkout-iniciado", "interesse-confirmado"], remove: [] },
  "checkout_iniciado":                { add: ["checkout-iniciado"], remove: [] },
  "checkout.completed":               { add: ["checkout-completo"], remove: ["checkout-iniciado"] },
  "order.paid":                       { add: ["compra-confirmada", "cliente-ativo", "plataforma-despertar"], remove: ["checkout-iniciado", "lead-morno"] },
  "product.access_granted":           { add: ["acesso-liberado", "cliente-ativo"], remove: [] },
  "lesson.completed":                 { add: ["engajada", "em-progresso"], remove: [] },
  "course.completed":                 { add: ["curso-concluido", "engajada"], remove: ["em-progresso"] },
  "lead.optin":                       { add: ["lead", "opt-in"], remove: ["visitante"] },
  "lead.optin.pain_proposito":        { add: ["lead", "dor-proposito"], remove: [] },
  "lead.optin.pain_dinheiro":         { add: ["lead", "dor-dinheiro"], remove: [] },
  "lead.optin.pain_relacionamentos":  { add: ["lead", "dor-relacionamentos"], remove: [] },
  "lead.optin.pain_ansiedade":        { add: ["lead", "dor-ansiedade"], remove: [] },
  "lead.diagnostic_completed":        { add: ["diagnostico-completo", "lead-qualificado"], remove: [] },
  "high_ticket.application_submitted":{ add: ["aplicacao-high-ticket", "lead-quente"], remove: [] },
  "order.refunded":                   { add: ["reembolso"], remove: ["cliente-ativo", "acesso-liberado"] },
  "order.overdue":                    { add: ["pagamento-em-atraso"], remove: [] },
};

function json(status: number, body: unknown, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req: Request) => {
  const cors = corsHeadersFor(req);
  const preflight = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  const apiKey = Deno.env.get("SEQUENZY_API_KEY");
  if (!apiKey) {
    console.error("[sequenzy-event] SEQUENZY_API_KEY not configured");
    return json(500, { error: "Sequenzy not configured" }, cors);
  }

  /* Parse body */
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" }, cors);
  }

  const event      = (body.event      as string | undefined)?.trim() ?? "";
  const email      = (body.email      as string | undefined)?.trim().toLowerCase() ?? "";
  const firstName  = (body.firstName  as string | undefined)?.trim() ?? "";
  const properties = (body.properties as Record<string, unknown> | undefined) ?? {};
  const customAttributes = (body.customAttributes as Record<string, unknown> | undefined) ?? {};

  if (!event) return json(400, { error: "event is required" }, cors);
  if (!email) return json(400, { error: "email is required" }, cors);

  /* Auth check for non-public events */
  if (!PUBLIC_EVENTS.has(event)) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Authorization required for this event" }, cors);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) return json(401, { error: "Invalid session" }, cors);
  }

  /* Build tag actions */
  const tagCfg = EVENT_TAGS[event] ?? { add: [], remove: [] };

  /* Fire all Sequenzy calls in parallel (non-blocking to caller) */
  const calls: Promise<void>[] = [
    /* 1. Upsert subscriber with latest attributes */
    sequenzyUpsertSubscriber(apiKey, {
      email,
      ...(firstName ? { firstName } : {}),
      customAttributes: {
        last_event: event,
        last_event_at: new Date().toISOString(),
        ...customAttributes,
      },
    }),

    /* 2. Fire the event → triggers associated sequences */
    sequenzyEvent(apiKey, email, event, properties as Record<string, string | number | boolean | null>),

    /* 3. Apply tag rules */
    ...(tagCfg.add.length > 0 || tagCfg.remove.length > 0
      ? [sequenzyTags(apiKey, email, tagCfg.add, tagCfg.remove)]
      : []),
  ];

  /* Built-in SaaS event mapping */
  if (event === "order.paid") {
    calls.push(sequenzyEvent(apiKey, email, "saas.purchase", properties as Record<string, string | number | boolean | null>));
  }
  if (event === "checkout.started") {
    calls.push(sequenzyEvent(apiKey, email, "checkout_iniciado", properties as Record<string, string | number | boolean | null>));
  }
  if (event === "user.registered") {
    calls.push(sequenzyEvent(apiKey, email, "contact.subscribed", { source: "platform" }));
  }

  await sequenzyBatch(calls);

  console.log(`[sequenzy-event] ${event} fired for ${email}`);
  return json(200, { ok: true, event, email }, cors);
});
