/**
 * Edge Function: crm-stats
 * Fetches marketing automation stats: subscribers, sequences, events, tags.
 * Uses SEQUENZY_API_KEY internally — never exposed to the client.
 *
 * GET /crm-stats?view=overview|subscribers|sequences|events
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor, handleCors } from "../_shared/cors.ts";

const BASE_URL = "https://api.sequenzy.com/api/v1";

function json(status: number, body: unknown, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function seqFetch(apiKey: string, path: string, params?: Record<string, string>) {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn(`[crm-stats] ${path} → ${res.status}: ${text.slice(0, 200)}`);
    return null;
  }
  return res.json().catch(() => null);
}

Deno.serve(async (req: Request) => {
  const cors = corsHeadersFor(req);
  const preflight = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "GET" && req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  // Admin auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" }, cors);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", "").trim());
  if (!user) return json(401, { error: "Invalid session" }, cors);

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  const { data: profile } = await supabaseAdmin
    .from("user_profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return json(403, { error: "Admin only" }, cors);

  const apiKey = Deno.env.get("SEQUENZY_API_KEY");
  if (!apiKey) {
    return json(200, { error: "not_configured", message: "Chave de automação não configurada" }, cors);
  }

  const url = new URL(req.url);
  // Accept view param from query string (GET) or JSON body (POST)
  let parsedBody: Record<string, string> = {};
  let view = url.searchParams.get("view") ?? "overview";
  if (req.method === "POST") {
    try {
      parsedBody = await req.json().catch(() => ({})) as Record<string, string>;
      view = parsedBody.view ?? view;
    } catch { /* use query params */ }
  }

  if (view === "overview" || view === "all") {
    // Fetch multiple endpoints in parallel
    const [subscribers, sequences, recentEvents, tags] = await Promise.all([
      seqFetch(apiKey, "/subscribers", { limit: "1", page: "1" }),
      seqFetch(apiKey, "/sequences"),
      seqFetch(apiKey, "/subscribers/events/recent", { limit: "20" }),
      seqFetch(apiKey, "/subscribers/tags"),
    ]);

    // Also pull internal DB stats for enrichment
    const { count: totalOrders } = await supabaseAdmin.from("orders").select("*", { count: "exact", head: true });
    const { count: paidOrders } = await supabaseAdmin.from("orders").select("*", { count: "exact", head: true }).eq("status", "paid");
    const { count: pendingOrders } = await supabaseAdmin.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending");
    const { count: totalUsers } = await supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true });
    const { count: totalMembers } = await supabaseAdmin.from("user_products").select("*", { count: "exact", head: true });

    // Revenue last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentRevenue } = await supabaseAdmin
      .from("orders")
      .select("amount")
      .eq("status", "paid")
      .gte("paid_at", thirtyDaysAgo);

    const revenue30d = (recentRevenue ?? []).reduce((s: number, o: { amount: number }) => s + o.amount, 0);

    return json(200, {
      platform: {
        totalUsers:    totalUsers ?? 0,
        totalMembers:  totalMembers ?? 0,
        totalOrders:   totalOrders ?? 0,
        paidOrders:    paidOrders ?? 0,
        pendingOrders: pendingOrders ?? 0,
        revenue30d,
      },
      automation: {
        subscribers:   subscribers?.meta?.total ?? subscribers?.total ?? null,
        sequences:     sequences?.data ?? sequences ?? null,
        recentEvents:  recentEvents?.data ?? recentEvents ?? null,
        tags:          tags?.data ?? tags ?? null,
      },
    }, cors);
  }

  if (view === "subscribers") {
    // For POST requests, page/limit/tag come from body; for GET from query
    const page  = url.searchParams.get("page")  ?? parsedBody?.page  ?? "1";
    const limit = url.searchParams.get("limit") ?? parsedBody?.limit ?? "25";
    const tag   = url.searchParams.get("tag")   ?? parsedBody?.tag;
    const qParams: Record<string, string> = { page, limit };
    if (tag) qParams.tag = tag;
    const data = await seqFetch(apiKey, "/subscribers", qParams);
    return json(200, data ?? { error: "Falha ao buscar assinantes" }, cors);
  }

  if (view === "sequences") {
    const data = await seqFetch(apiKey, "/sequences");
    return json(200, data ?? { error: "Falha ao buscar sequências" }, cors);
  }

  if (view === "events") {
    const data = await seqFetch(apiKey, "/subscribers/events/recent", { limit: "50" });
    return json(200, data ?? { error: "Falha ao buscar eventos" }, cors);
  }

  /**
   * view=funnel — Mapa do Poder conversion funnel
   * Aggregates counts for: mapa.started, mapa.step_completed (by step),
   * mapa.lead_captured, mapa.finished from the Sequenzy events endpoint
   * plus internal launch_waitlist rows for lead count verification.
   */
  if (view === "funnel") {
    // Fetch recent events with a high limit to aggregate across all users
    const [eventsData, waitlistData] = await Promise.all([
      seqFetch(apiKey, "/subscribers/events/recent", { limit: "100" }),
      supabaseAdmin
        .from("launch_waitlist")
        .select("id, source, created_at", { count: "exact" })
        .eq("source", "mapa_do_poder")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    const events: Record<string, unknown>[] = eventsData?.data ?? eventsData ?? [];

    // Aggregate counts per event type
    const counts: Record<string, number> = {};
    const stepCounts: Record<number, number> = {};
    const sourceCounts: Record<string, number> = {};

    for (const ev of events) {
      const name = String(ev.event ?? ev.name ?? "");
      counts[name] = (counts[name] ?? 0) + 1;

      // Aggregate step_completed by step number
      if (name === "mapa.step_completed") {
        const props = (ev.properties ?? ev.metadata ?? {}) as Record<string, unknown>;
        const stepNum = Number(props.step_number ?? 0);
        if (stepNum > 0) stepCounts[stepNum] = (stepCounts[stepNum] ?? 0) + 1;
      }

      // Aggregate QR source
      if (name === "mapa.started") {
        const props = (ev.properties ?? ev.metadata ?? {}) as Record<string, unknown>;
        const src = String(props.source ?? "qr");
        sourceCounts[src] = (sourceCounts[src] ?? 0) + 1;
      }
    }

    const started       = counts["mapa.started"]       ?? 0;
    const stepCompleted = counts["mapa.step_completed"] ?? 0;
    const leadCaptured  = counts["mapa.lead_captured"]  ?? 0;
    const finished      = counts["mapa.finished"]       ?? 0;

    // Internal: leads saved to launch_waitlist
    const dbLeadCount = waitlistData.count ?? 0;
    const recentLeads = (waitlistData.data ?? []) as { id: string; created_at: string }[];

    // Conversion rates (guard division by zero)
    const cvStarted  = started > 0 ? +((finished      / started)      * 100).toFixed(1) : 0;
    const cvLead     = started > 0 ? +((leadCaptured  / started)      * 100).toFixed(1) : 0;
    const cvFinished = started > 0 ? +((finished      / started)      * 100).toFixed(1) : 0;

    // Steps array for the bar chart (steps 1-8)
    const steps = Array.from({ length: 8 }, (_, i) => ({
      step: i + 1,
      count: stepCounts[i + 1] ?? 0,
      pct: started > 0 ? +((( stepCounts[i + 1] ?? 0) / started) * 100).toFixed(1) : 0,
    }));

    return json(200, {
      funnel: [
        { id: "mapa.started",       label: "Iniciaram",       count: started,       pct: 100,       color: "gold" },
        { id: "mapa.step_completed", label: "Etapas concluídas", count: stepCompleted, pct: started > 0 ? +((stepCompleted / (started * 8)) * 100).toFixed(1) : 0, color: "lavender" },
        { id: "mapa.lead_captured", label: "Leads capturados", count: leadCaptured,  pct: cvLead,   color: "sage" },
        { id: "mapa.finished",      label: "Finalizaram",      count: finished,      pct: cvFinished, color: "rose" },
      ],
      steps,
      sources: sourceCounts,
      dbLeadCount,
      recentLeads: recentLeads.slice(0, 10),
      conversionRate: cvStarted,
      totalStarted: started,
    }, cors);
  }

  return json(400, { error: "Invalid view parameter" }, cors);
});
