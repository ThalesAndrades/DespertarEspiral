/**
 * AdminSocialPage — Gestão de Redes Sociais
 * Instagram Business + LinkedIn Organization via Graph APIs
 */
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw, Users, Eye, Heart, MessageCircle,
  TrendingUp, ExternalLink, AlertCircle, Image, Link as LinkIcon,
  Share2, BarChart2,
} from "lucide-react";

/* ─────────── Types ─────────── */
interface IGAccount {
  name: string; username: string; followers: number; following: number;
  mediaCount: number; profilePicture?: string; biography?: string; website?: string;
}
interface IGInsights { impressions30d: number; reach30d: number; profileViews30d: number; }
interface IGMedia {
  id: string; caption?: string; media_type: string;
  media_url?: string; thumbnail_url?: string; permalink: string;
  timestamp: string; like_count: number; comments_count: number;
}
interface LIAccount { name: string; website?: string; followers: number; }
interface LIStats  { pageViews30d: number; uniqueViews30d: number; clicks30d: number; }

interface SocialData {
  instagram?: {
    account?: IGAccount; insights?: IGInsights; recentMedia?: IGMedia[];
    error?: string; message?: string;
  };
  linkedin?: {
    account?: LIAccount; stats?: LIStats; recentPosts?: unknown[];
    error?: string; message?: string;
  };
}

/* ─────────── Stat card ─────────── */
function StatCard({ label, value, icon: Icon, color = "var(--gold)", sub }: {
  label: string; value: string | number; icon: React.ElementType; color?: string; sub?: string;
}) {
  return (
    <div className="card-dark" style={{ padding: "clamp(16px,2.5vw,22px) clamp(14px,2.5vw,20px)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "14px" }}>
        <p className="font-label" style={{ fontSize: "8.5px", letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</p>
        <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: `${color}14`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={12} style={{ color }} strokeWidth={1.5} />
        </div>
      </div>
      <p className="font-display" style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 300, color, lineHeight: 1 }}>
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </p>
      {sub && <p style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "6px" }}>{sub}</p>}
    </div>
  );
}

/* ─────────── Not configured card ─────────── */
function NotConfigured({ platform, message }: { platform: string; message?: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: "14px", padding: "48px 24px", textAlign: "center",
      background: "var(--bg-surface-2)", borderRadius: "var(--r-xl)",
      border: "1px dashed var(--border-soft)",
    }}>
      <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(198,168,112,0.08)", border: "1px solid var(--border-mid)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AlertCircle size={20} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
      </div>
      <div>
        <p style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: 500, marginBottom: "6px" }}>
          {platform} não configurado
        </p>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6, maxWidth: "360px" }}>
          {message ?? `Configure as credenciais de API do ${platform} nos Secrets do OnSpace Cloud para ativar a integração.`}
        </p>
      </div>
    </div>
  );
}

/* ─────────── Tab ─────────── */
type Tab = "instagram" | "linkedin";

export default function AdminSocialPage() {
  const [tab,       setTab]     = useState<Tab>("instagram");
  const [data,      setData]    = useState<SocialData>({});
  const [loading,   setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("social-stats", {
      body: { platform: "all" },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try { const t = await error.context?.text(); msg = t || msg; } catch { /* ignore */ }
      }
      toast.error(`Erro ao carregar dados sociais: ${msg}`);
    } else {
      setData(data ?? {});
    }

    if (showLoader) setLoading(false);
    else setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const ig = data.instagram;
  const li = data.linkedin;

  return (
    <AdminLayout>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "28px", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <p className="overline" style={{ color: "var(--gold)", marginBottom: "6px", fontSize: "9px" }}>Marketing</p>
            <h1 className="font-display" style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: 300, color: "var(--text-primary)" }}>Redes Sociais</h1>
          </div>
          <button
            onClick={() => fetchData(false)}
            disabled={refreshing}
            className="btn-ghost"
            style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 16px" }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.15em" }}>Atualizar</span>
          </button>
        </div>

        {/* Platform tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          {([
            { key: "instagram" as Tab, label: "Instagram", color: "#e1306c" },
            { key: "linkedin"  as Tab, label: "LinkedIn",  color: "#0a66c2" },
          ] as const).map(({ key, label, color }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="font-label"
                style={{
                  padding: "8px 20px", borderRadius: "100px",
                  border: `1px solid ${active ? color : "var(--border-soft)"}`,
                  background: active ? `${color}15` : "transparent",
                  color: active ? color : "var(--text-muted)",
                  fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Instagram ── */}
        {tab === "instagram" && (
          <>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
                  {[0,1,2].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                </div>
                <Skeleton className="h-48 rounded-2xl" />
              </div>
            ) : ig?.error && ig.error !== "not_configured" ? (
              <div className="card-dark" style={{ padding: "24px", color: "var(--rose)" }}>
                <p style={{ fontSize: "14px" }}>Erro: {ig.error}</p>
              </div>
            ) : ig?.error === "not_configured" ? (
              <NotConfigured platform="Instagram" message={ig.message} />
            ) : (
              <>
                {/* Account header */}
                {ig?.account && (
                  <div className="card-dark" style={{ padding: "clamp(16px,3vw,24px)", marginBottom: "16px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                    {ig.account.profilePicture && (
                      <img
                        src={ig.account.profilePicture}
                        alt={ig.account.name}
                        style={{ width: "56px", height: "56px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(225,48,108,0.30)", flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "16px", color: "var(--text-primary)", fontWeight: 500, marginBottom: "3px" }}>{ig.account.name}</p>
                      <p style={{ fontSize: "13px", color: "#e1306c" }}>@{ig.account.username}</p>
                      {ig.account.biography && (
                        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", lineHeight: 1.5 }}>{ig.account.biography}</p>
                      )}
                    </div>
                    {ig.account.website && (
                      <a href={ig.account.website} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ padding: "8px 14px", fontSize: "9px", display: "flex", alignItems: "center", gap: "5px" }}>
                        <LinkIcon size={11} /> Site
                      </a>
                    )}
                  </div>
                )}

                {/* Stats grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "12px", marginBottom: "20px" }}>
                  <StatCard label="Seguidores" value={ig?.account?.followers ?? 0} icon={Users} color="#e1306c" />
                  <StatCard label="Publicações" value={ig?.account?.mediaCount ?? 0} icon={Image} color="var(--gold)" />
                  <StatCard label="Alcance 30d" value={ig?.insights?.reach30d ?? 0} icon={Eye} color="var(--lavender)" />
                  <StatCard label="Impressões 30d" value={ig?.insights?.impressions30d ?? 0} icon={BarChart2} color="var(--sage)" />
                  <StatCard label="Visitas ao Perfil" value={ig?.insights?.profileViews30d ?? 0} icon={TrendingUp} color="var(--rose)" />
                </div>

                {/* Recent media grid */}
                {(ig?.recentMedia ?? []).length > 0 && (
                  <div>
                    <p className="overline" style={{ fontSize: "8px", color: "var(--text-muted)", marginBottom: "12px", letterSpacing: "0.22em" }}>Publicações recentes</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: "10px" }}>
                      {(ig?.recentMedia ?? []).map((m) => (
                        <a
                          key={m.id}
                          href={m.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: "none", borderRadius: "12px", overflow: "hidden", display: "block", border: "1px solid var(--border-subtle)", background: "var(--bg-surface-2)", transition: "border-color 0.2s" }}
                        >
                          {(m.media_url || m.thumbnail_url) ? (
                            <img
                              src={m.thumbnail_url ?? m.media_url}
                              alt={m.caption?.slice(0, 40) ?? "Post"}
                              style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }}
                            />
                          ) : (
                            <div style={{ width: "100%", aspectRatio: "1", background: "var(--bg-surface-3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Image size={20} style={{ color: "var(--text-faint)" }} strokeWidth={1.5} />
                            </div>
                          )}
                          <div style={{ padding: "8px" }}>
                            <div style={{ display: "flex", gap: "10px" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--text-muted)" }}>
                                <Heart size={10} style={{ color: "#e1306c" }} /> {m.like_count.toLocaleString()}
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--text-muted)" }}>
                                <MessageCircle size={10} /> {m.comments_count}
                              </span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── LinkedIn ── */}
        {tab === "linkedin" && (
          <>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
                  {[0,1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                </div>
              </div>
            ) : li?.error && li.error !== "not_configured" ? (
              <div className="card-dark" style={{ padding: "24px", color: "var(--rose)" }}>
                <p style={{ fontSize: "14px" }}>Erro: {li.error}</p>
              </div>
            ) : li?.error === "not_configured" ? (
              <NotConfigured platform="LinkedIn" message={li.message} />
            ) : (
              <>
                {li?.account && (
                  <div className="card-dark" style={{ padding: "clamp(16px,3vw,24px)", marginBottom: "16px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ width: "52px", height: "52px", borderRadius: "10px", background: "rgba(10,102,194,0.15)", border: "1px solid rgba(10,102,194,0.30)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Share2 size={20} style={{ color: "#0a66c2" }} strokeWidth={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "16px", color: "var(--text-primary)", fontWeight: 500 }}>{li.account.name}</p>
                      {li.account.website && (
                        <a href={li.account.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: "13px", color: "#0a66c2", display: "inline-flex", alignItems: "center", gap: "5px", marginTop: "3px" }}>
                          <ExternalLink size={11} /> {li.account.website}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "12px" }}>
                  <StatCard label="Seguidores" value={li?.account?.followers ?? 0} icon={Users} color="#0a66c2" />
                  <StatCard label="Vis. de Página 30d" value={li?.stats?.pageViews30d ?? 0} icon={Eye} color="var(--gold)" />
                  <StatCard label="Vis. Únicas 30d" value={li?.stats?.uniqueViews30d ?? 0} icon={BarChart2} color="var(--lavender)" />
                  <StatCard label="Cliques 30d" value={li?.stats?.clicks30d ?? 0} icon={TrendingUp} color="var(--sage)" />
                </div>

                {(li?.recentPosts ?? []).length > 0 && (
                  <div style={{ marginTop: "20px" }}>
                    <p className="overline" style={{ fontSize: "8px", color: "var(--text-muted)", marginBottom: "12px", letterSpacing: "0.22em" }}>Publicações recentes</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {(li.recentPosts ?? []).slice(0, 6).map((post: unknown, i: number) => {
                        const p = post as Record<string, unknown>;
                        return (
                          <div key={i} className="card-dark" style={{ padding: "14px 16px" }}>
                            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                              {String((p.specificContent as Record<string, unknown>)?.["com.linkedin.ugc.ShareContent"]?.["shareCommentary"]?.["text"] ?? "—").slice(0, 200)}
                            </p>
                            <p style={{ fontSize: "10px", color: "var(--text-faint)", marginTop: "8px" }}>
                              {p.created ? new Date((p.created as Record<string,number>).time).toLocaleDateString("pt-BR") : ""}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </AdminLayout>
  );
}
