/**
 * Edge Function: ads-stats
 * Fetches Meta Ads (Facebook/Instagram) and Google Ads campaign performance.
 *
 * Required secrets:
 *   META_ACCESS_TOKEN        – System user or user access token with ads_read permission
 *   META_AD_ACCOUNT_ID       – Meta Ad Account ID (act_XXXXXXXXXX)
 *   GOOGLE_ADS_DEVELOPER_TOKEN  – Google Ads developer token
 *   GOOGLE_ADS_CUSTOMER_ID      – Google Ads customer ID (no dashes)
 *   GOOGLE_ADS_REFRESH_TOKEN    – OAuth2 refresh token
 *   GOOGLE_ADS_CLIENT_ID        – OAuth2 client ID
 *   GOOGLE_ADS_CLIENT_SECRET    – OAuth2 client secret
 *
 * GET /ads-stats?platform=meta|google|all&dateRange=last_30d|last_7d|this_month|last_month
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor, handleCors } from "../_shared/cors.ts";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";
const GOOGLE_ADS_BASE = "https://googleads.googleapis.com/v18";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

function json(status: number, body: unknown, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function requireAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", "").trim());
  if (!user) return false;

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  const { data: profile } = await supabaseAdmin
    .from("user_profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin";
}

/* ── Date range helpers ── */
function getDateRange(range: string): { since: string; until: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (range) {
    case "last_7d": {
      const since = new Date(now.getTime() - 7 * 86400000);
      return { since: fmt(since), until: fmt(now) };
    }
    case "this_month": {
      const since = new Date(now.getFullYear(), now.getMonth(), 1);
      return { since: fmt(since), until: fmt(now) };
    }
    case "last_month": {
      const since = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const until = new Date(now.getFullYear(), now.getMonth(), 0);
      return { since: fmt(since), until: fmt(until) };
    }
    default: { // last_30d
      const since = new Date(now.getTime() - 30 * 86400000);
      return { since: fmt(since), until: fmt(now) };
    }
  }
}

/* ── META ADS ── */
async function fetchMetaStats(accessToken: string, adAccountId: string, dateRange: string) {
  const { since, until } = getDateRange(dateRange);

  const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  try {
    // Account overview
    const accountRes = await fetch(
      `${GRAPH_BASE}/${accountId}?fields=name,currency,account_status,amount_spent,balance&access_token=${accessToken}`
    );
    if (!accountRes.ok) {
      const err = await accountRes.text().catch(() => "");
      return { error: `Meta API: ${accountRes.status} — ${err.slice(0, 150)}` };
    }
    const account = await accountRes.json();

    // Insights — aggregate performance
    const insightsFields = "spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,action_values";
    const insightsRes = await fetch(
      `${GRAPH_BASE}/${accountId}/insights?fields=${insightsFields}&time_range={"since":"${since}","until":"${until}"}&level=account&access_token=${accessToken}`
    );
    let insights: Record<string, unknown> = {};
    if (insightsRes.ok) {
      const id = await insightsRes.json();
      insights = id.data?.[0] ?? {};
    }

    // Campaigns
    const campsRes = await fetch(
      `${GRAPH_BASE}/${accountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,insights{spend,impressions,clicks,ctr,actions}&effective_status=["ACTIVE","PAUSED"]&limit=20&access_token=${accessToken}`
    );
    let campaigns: unknown[] = [];
    if (campsRes.ok) {
      const cd = await campsRes.json();
      campaigns = cd.data ?? [];
    }

    // Daily spend breakdown
    const dailyRes = await fetch(
      `${GRAPH_BASE}/${accountId}/insights?fields=spend,impressions,clicks,reach&time_range={"since":"${since}","until":"${until}"}&time_increment=1&level=account&access_token=${accessToken}`
    );
    let dailyData: unknown[] = [];
    if (dailyRes.ok) {
      const dd = await dailyRes.json();
      dailyData = dd.data ?? [];
    }

    // Extract conversions from actions
    const actions = (insights.actions as { action_type: string; value: string }[] ?? []);
    const purchases = actions.find(a => a.action_type === "purchase")?.value ?? "0";
    const leads     = actions.find(a => a.action_type === "lead")?.value ?? "0";
    const landingPageViews = actions.find(a => a.action_type === "landing_page_view")?.value ?? "0";

    const actionValues = (insights.action_values as { action_type: string; value: string }[] ?? []);
    const purchaseValue = actionValues.find(a => a.action_type === "purchase")?.value ?? "0";

    return {
      account: {
        name:          account.name,
        currency:      account.currency ?? "BRL",
        status:        account.account_status,
        totalSpent:    account.amount_spent ? (parseInt(account.amount_spent as string) / 100).toFixed(2) : "0.00",
      },
      summary: {
        spend:             parseFloat((insights.spend as string ?? "0")),
        impressions:       parseInt(insights.impressions as string ?? "0"),
        clicks:            parseInt(insights.clicks as string ?? "0"),
        ctr:               parseFloat(insights.ctr as string ?? "0"),
        cpc:               parseFloat(insights.cpc as string ?? "0"),
        cpm:               parseFloat(insights.cpm as string ?? "0"),
        reach:             parseInt(insights.reach as string ?? "0"),
        frequency:         parseFloat(insights.frequency as string ?? "0"),
        purchases:         parseInt(purchases),
        purchaseValue:     parseFloat(purchaseValue),
        leads:             parseInt(leads),
        landingPageViews:  parseInt(landingPageViews),
        roas:              parseFloat(insights.spend as string ?? "0") > 0
          ? (parseFloat(purchaseValue) / parseFloat(insights.spend as string ?? "1")).toFixed(2)
          : "0.00",
      },
      campaigns,
      dailyData,
      dateRange: { since, until },
    };
  } catch (e) {
    console.error("[ads-stats] Meta error:", e);
    return { error: "Falha ao conectar com Meta Ads" };
  }
}

/* ── GOOGLE ADS ── */
async function refreshGoogleToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string | null> {
  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    console.warn("[ads-stats] Google token refresh failed:", await res.text().catch(() => ""));
    return null;
  }
  const data = await res.json();
  return data.access_token ?? null;
}

async function fetchGoogleStats(
  devToken: string, customerId: string, refreshToken: string,
  clientId: string, clientSecret: string, dateRange: string
) {
  const { since, until } = getDateRange(dateRange);

  try {
    const accessToken = await refreshGoogleToken(clientId, clientSecret, refreshToken);
    if (!accessToken) return { error: "Falha ao renovar token Google Ads" };

    const cleanCustomerId = customerId.replace(/-/g, "");

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.conversions_value,
        metrics.all_conversions,
        metrics.search_impression_share,
        metrics.cost_per_conversion
      FROM campaign
      WHERE segments.date BETWEEN '${since}' AND '${until}'
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
      LIMIT 25
    `.trim().replace(/\s+/g, " ");

    const gaRes = await fetch(
      `${GOOGLE_ADS_BASE}/customers/${cleanCustomerId}/googleAds:searchStream`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": devToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!gaRes.ok) {
      const errText = await gaRes.text().catch(() => "");
      console.warn("[ads-stats] Google Ads API error:", gaRes.status, errText.slice(0, 300));
      return { error: `Google Ads API: ${gaRes.status} — ${errText.slice(0, 150)}` };
    }

    // searchStream returns NDJSON
    const rawText = await gaRes.text();
    const results: unknown[] = [];
    for (const line of rawText.split("\n").filter(l => l.trim())) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.results) results.push(...parsed.results);
      } catch { /* skip */ }
    }

    // Aggregate totals
    let totalCostMicros = 0, totalImpressions = 0, totalClicks = 0;
    let totalConversions = 0, totalConvValue = 0;
    const campaigns = [];

    for (const row of results as Record<string, Record<string, unknown>>[]) {
      const m = row.metrics ?? {};
      const cost = parseInt(m.cost_micros as string ?? "0");
      const impr = parseInt(m.impressions as string ?? "0");
      const clk  = parseInt(m.clicks as string ?? "0");
      const conv = parseFloat(m.conversions as string ?? "0");
      const convVal = parseFloat(m.conversions_value as string ?? "0");

      totalCostMicros    += cost;
      totalImpressions   += impr;
      totalClicks        += clk;
      totalConversions   += conv;
      totalConvValue     += convVal;

      campaigns.push({
        id:      row.campaign?.id,
        name:    row.campaign?.name,
        status:  row.campaign?.status,
        type:    row.campaign?.advertising_channel_type,
        spend:   (cost / 1_000_000).toFixed(2),
        impressions: impr,
        clicks: clk,
        ctr:    (impr > 0 ? (clk / impr) * 100 : 0).toFixed(2),
        cpc:    (clk > 0 ? cost / clk / 1_000_000 : 0).toFixed(2),
        conversions: conv.toFixed(1),
        conversionValue: convVal.toFixed(2),
        roas: (cost > 0 ? (convVal * 1_000_000) / cost : 0).toFixed(2),
        costPerConversion: (m.cost_per_conversion as string) ? parseFloat(m.cost_per_conversion as string).toFixed(2) : "—",
      });
    }

    const totalSpend = totalCostMicros / 1_000_000;

    return {
      summary: {
        spend:       totalSpend.toFixed(2),
        impressions: totalImpressions,
        clicks:      totalClicks,
        ctr:         (totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0).toFixed(2),
        cpc:         (totalClicks > 0 ? totalSpend / totalClicks : 0).toFixed(2),
        conversions: totalConversions.toFixed(1),
        conversionValue: totalConvValue.toFixed(2),
        roas:        (totalSpend > 0 ? totalConvValue / totalSpend : 0).toFixed(2),
      },
      campaigns,
      dateRange: { since, until },
    };
  } catch (e) {
    console.error("[ads-stats] Google Ads error:", e);
    return { error: "Falha ao conectar com Google Ads" };
  }
}

/* ── Main ── */
Deno.serve(async (req: Request) => {
  const cors = corsHeadersFor(req);
  const preflight = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "GET" && req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  if (!(await requireAdmin(req))) return json(401, { error: "Admin access required" }, cors);

  const url = new URL(req.url);
  // Accept params from query string (GET) or JSON body (POST — default for supabase.functions.invoke)
  let platform  = url.searchParams.get("platform")  ?? "all";
  let dateRange = url.searchParams.get("dateRange") ?? "last_30d";
  if (req.method === "POST") {
    try {
      const body = await req.json().catch(() => ({})) as Record<string, string>;
      platform  = body.platform  ?? platform;
      dateRange = body.dateRange ?? dateRange;
    } catch { /* use query params */ }
  }

  const metaToken   = Deno.env.get("META_ACCESS_TOKEN");
  const metaAccId   = Deno.env.get("META_AD_ACCOUNT_ID");
  const gDevToken   = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN");
  const gCustId     = Deno.env.get("GOOGLE_ADS_CUSTOMER_ID");
  const gRefToken   = Deno.env.get("GOOGLE_ADS_REFRESH_TOKEN");
  const gClientId   = Deno.env.get("GOOGLE_ADS_CLIENT_ID");
  const gClientSec  = Deno.env.get("GOOGLE_ADS_CLIENT_SECRET");

  const result: Record<string, unknown> = {};

  const fetchMeta   = platform === "meta"   || platform === "all";
  const fetchGoogle = platform === "google" || platform === "all";

  const [metaResult, googleResult] = await Promise.all([
    fetchMeta && metaToken && metaAccId
      ? fetchMetaStats(metaToken, metaAccId, dateRange)
      : Promise.resolve(fetchMeta
          ? { error: "not_configured", message: "META_ACCESS_TOKEN ou META_AD_ACCOUNT_ID não configurados" }
          : undefined),
    fetchGoogle && gDevToken && gCustId && gRefToken && gClientId && gClientSec
      ? fetchGoogleStats(gDevToken, gCustId, gRefToken, gClientId, gClientSec, dateRange)
      : Promise.resolve(fetchGoogle
          ? { error: "not_configured", message: "Credenciais do Google Ads não configuradas" }
          : undefined),
  ]);

  if (metaResult   !== undefined) result.meta   = metaResult;
  if (googleResult !== undefined) result.google = googleResult;
  result.dateRange = dateRange;

  return json(200, result, cors);
});
