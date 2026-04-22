/**
 * Edge Function: social-stats
 * Fetches Instagram Business + LinkedIn Organization stats via official APIs.
 *
 * Required secrets:
 *   META_ACCESS_TOKEN          – long-lived Page access token (Facebook/Instagram Graph API)
 *   INSTAGRAM_BUSINESS_ACCOUNT_ID – Instagram Business Account ID (numeric)
 *   LINKEDIN_ACCESS_TOKEN      – LinkedIn OAuth access token
 *   LINKEDIN_ORGANIZATION_ID   – LinkedIn Organization ID (urn:li:organization:XXX → just XXX)
 *
 * GET /social-stats?platform=instagram|linkedin|all
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor, handleCors } from "../_shared/cors.ts";

const IG_GRAPH = "https://graph.facebook.com/v21.0";
const LI_API   = "https://api.linkedin.com/v2";

function json(status: number, body: unknown, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/* ── Instagram ── */
async function fetchInstagramStats(accessToken: string, igAccountId: string) {
  try {
    // Account summary
    const accountUrl = `${IG_GRAPH}/${igAccountId}?fields=name,username,followers_count,follows_count,media_count,profile_picture_url,biography,website&access_token=${accessToken}`;
    const accountRes = await fetch(accountUrl);
    if (!accountRes.ok) {
      const err = await accountRes.text().catch(() => "");
      console.warn("[social-stats] IG account error:", accountRes.status, err.slice(0, 200));
      return { error: `Instagram API: ${accountRes.status}` };
    }
    const account = await accountRes.json();

    // Insights: impressions, reach, profile_views (last 30 days)
    const insightsUrl = `${IG_GRAPH}/${igAccountId}/insights?metric=impressions,reach,profile_views&period=day&since=${Math.floor(Date.now() / 1000) - 30 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${accessToken}`;
    const insightsRes = await fetch(insightsUrl);
    let insights: Record<string, number> = {};
    if (insightsRes.ok) {
      const insightsData = await insightsRes.json();
      for (const metric of (insightsData.data ?? [])) {
        const total = (metric.values ?? []).reduce((s: number, v: { value: number }) => s + (v.value || 0), 0);
        insights[metric.name as string] = total;
      }
    }

    // Recent media (last 8 posts)
    const mediaUrl = `${IG_GRAPH}/${igAccountId}/media?fields=id,caption,media_type,thumbnail_url,media_url,permalink,timestamp,like_count,comments_count&limit=8&access_token=${accessToken}`;
    const mediaRes = await fetch(mediaUrl);
    let media: unknown[] = [];
    if (mediaRes.ok) {
      const mediaData = await mediaRes.json();
      media = mediaData.data ?? [];
    }

    return {
      account: {
        name:            account.name,
        username:        account.username,
        followers:       account.followers_count ?? 0,
        following:       account.follows_count   ?? 0,
        mediaCount:      account.media_count     ?? 0,
        profilePicture:  account.profile_picture_url,
        biography:       account.biography,
        website:         account.website,
      },
      insights: {
        impressions30d: insights.impressions   ?? 0,
        reach30d:       insights.reach         ?? 0,
        profileViews30d:insights.profile_views ?? 0,
      },
      recentMedia: media,
    };
  } catch (e) {
    console.error("[social-stats] Instagram error:", e);
    return { error: "Falha ao conectar com Instagram" };
  }
}

/* ── LinkedIn ── */
async function fetchLinkedInStats(accessToken: string, orgId: string) {
  const liHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "X-Restli-Protocol-Version": "2.0.0",
  };

  try {
    // Organization details
    const orgRes = await fetch(
      `${LI_API}/organizations/${orgId}?fields=name,localizedName,localizedWebsite,logoV2(original~:playableStreams),followingInfo`,
      { headers: liHeaders }
    );
    if (!orgRes.ok) {
      const err = await orgRes.text().catch(() => "");
      console.warn("[social-stats] LI org error:", orgRes.status, err.slice(0, 200));
      return { error: `LinkedIn API: ${orgRes.status}` };
    }
    const org = await orgRes.json();

    // Follower stats
    const followRes = await fetch(
      `${LI_API}/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn%3Ali%3Aorganization%3A${orgId}`,
      { headers: liHeaders }
    );
    let followStats: Record<string, unknown> = {};
    if (followRes.ok) {
      const fd = await followRes.json();
      followStats = fd.elements?.[0] ?? {};
    }

    // Page statistics (impressions, clicks, engagement)
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const statsRes = await fetch(
      `${LI_API}/organizationPageStatistics?q=organization&organization=urn%3Ali%3Aorganization%3A${orgId}&timeIntervals.timeGranularityType=MONTH&timeIntervals.timeRange.start=${thirtyDaysAgo}&timeIntervals.timeRange.end=${now}`,
      { headers: liHeaders }
    );
    let pageStats: Record<string, number> = {};
    if (statsRes.ok) {
      const sd = await statsRes.json();
      const elements = sd.elements ?? [];
      for (const el of elements) {
        const ts = el.totalPageStatistics ?? {};
        pageStats.pageViews   = (pageStats.pageViews   ?? 0) + (ts.views?.pageViews?.pageViews ?? 0);
        pageStats.uniqueViews = (pageStats.uniqueViews ?? 0) + (ts.views?.pageViews?.uniquePageViews ?? 0);
        pageStats.clicks      = (pageStats.clicks      ?? 0) + (ts.clicks?.allPageClicks?.pageClicks ?? 0);
      }
    }

    // Recent posts (UGC posts)
    const ugcRes = await fetch(
      `${LI_API}/ugcPosts?q=authors&authors=List(urn%3Ali%3Aorganization%3A${orgId})&count=8`,
      { headers: liHeaders }
    );
    let posts: unknown[] = [];
    if (ugcRes.ok) {
      const pd = await ugcRes.json();
      posts = pd.elements ?? [];
    }

    const followers = (followStats.followerCountsByAssociationType as { followerCounts?: { organicFollowerCount?: number } }[] ?? [])
      .reduce((s: number, f) => s + (f.followerCounts?.organicFollowerCount ?? 0), 0);

    return {
      account: {
        name:     (org.localizedName as string) ?? (org.name?.localized?.pt_BR ?? ""),
        website:  org.localizedWebsite,
        followers,
      },
      stats: {
        pageViews30d:   pageStats.pageViews   ?? 0,
        uniqueViews30d: pageStats.uniqueViews ?? 0,
        clicks30d:      pageStats.clicks      ?? 0,
      },
      recentPosts: posts.slice(0, 8),
    };
  } catch (e) {
    console.error("[social-stats] LinkedIn error:", e);
    return { error: "Falha ao conectar com LinkedIn" };
  }
}

/* ── Main ── */
Deno.serve(async (req: Request) => {
  const cors = corsHeadersFor(req);
  const preflight = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "GET" && req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  // Auth: require valid admin JWT
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

  const url = new URL(req.url);
  // Accept params from query string (GET) or JSON body (POST — default for supabase.functions.invoke)
  let platform = url.searchParams.get("platform") ?? "all";
  if (req.method === "POST") {
    try {
      const body = await req.json().catch(() => ({})) as Record<string, string>;
      platform = body.platform ?? platform;
    } catch { /* use query params */ }
  }

  const metaToken    = Deno.env.get("META_ACCESS_TOKEN");
  const igAccountId  = Deno.env.get("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  const liToken      = Deno.env.get("LINKEDIN_ACCESS_TOKEN");
  const liOrgId      = Deno.env.get("LINKEDIN_ORGANIZATION_ID");

  const result: Record<string, unknown> = {};

  if (platform === "instagram" || platform === "all") {
    if (metaToken && igAccountId) {
      result.instagram = await fetchInstagramStats(metaToken, igAccountId);
    } else {
      result.instagram = { error: "not_configured", message: "META_ACCESS_TOKEN ou INSTAGRAM_BUSINESS_ACCOUNT_ID não configurados" };
    }
  }

  if (platform === "linkedin" || platform === "all") {
    if (liToken && liOrgId) {
      result.linkedin = await fetchLinkedInStats(liToken, liOrgId);
    } else {
      result.linkedin = { error: "not_configured", message: "LINKEDIN_ACCESS_TOKEN ou LINKEDIN_ORGANIZATION_ID não configurados" };
    }
  }

  return json(200, result, cors);
});
