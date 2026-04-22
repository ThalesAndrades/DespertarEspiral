/**
 * AdminCRMPage — Central de Automação e CRM
 * Exibe dados de automação de marketing + métricas internas da plataforma.
 * Internamente usa SEQUENZY_API_KEY via edge function (sem expor a ferramenta ao cliente).
 */
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw, Users, TrendingUp, ShoppingBag, Activity,
  Mail, Zap, Tag, AlertCircle, DollarSign, UserCheck, Clock,
} from "lucide-react";

/* ─────────── Types ─────────── */
interface PlatformStats {
  totalUsers: number; totalMembers: number;
  totalOrders: number; paidOrders: number; pendingOrders: number; revenue30d: number;
}
interface AutomationStats {
  subscribers: number | null;
  sequences: Record<string, unknown>[] | null;
  recentEvents: Record<string, unknown>[] | null;
  tags: Record<string, unknown>[] | null;
}
interface CRMData {
  platform?: PlatformStats;
  automation?: AutomationStats;
  error?: string;
  message?: string;
}

/* ─────────── Stat card ─────────── */
function MetricCard({
  label, value, icon: Icon, color = "var(--gold)", sub, trend
}: {
  label: string; value: string | number; icon: React.ElementType;
  color?: string; sub?: string; trend?: string;
}) {
  return (
    <div className="card-dark" style={{ padding: "clamp(16px,2.5vw,22px) clamp(14px,2vw,20px)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "12px" }}>
        <p className="font-label" style={{ fontSize: "8px", letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</p>
        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: `${color}14`, border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={12} style={{ color }} strokeWidth={1.5} />
        </div>
      </div>
      <p className="font-display" style={{ fontSize: "clamp(20px,3vw,30px)", fontWeight: 300, color, lineHeight: 1 }}>
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </p>
      {sub && <p style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "5px" }}>{sub}</p>}
      {trend && (
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "8px" }}>
          <TrendingUp size={10} style={{ color: "var(--sage)" }} strokeWidth={1.5} />
          <span style={{ fontSize: "10px", color: "var(--sage)" }}>{trend}</span>
        </div>
      )}
    </div>
  );
}

/* ─────────── Not configured ─────────── */
function NotConfigured({ message }: { message?: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
      padding: "32px 24px", borderRadius: "var(--r-xl)",
      border: "1px dashed var(--border-soft)", textAlign: "center",
      background: "var(--bg-surface-2)",
    }}>
      <AlertCircle size={20} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
      <p style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "320px", lineHeight: 1.6 }}>
        {message ?? "Automação de marketing não configurada. Verifique as credenciais nos Secrets."}
      </p>
    </div>
  );
}

export default function AdminCRMPage() {
  const [data,       setData]       = useState<CRMData>({});
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab,  setActiveTab]  = useState<"overview" | "sequences" | "events" | "tags">("overview");

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("crm-stats", {
      body: { view: activeTab === "overview" ? "overview" : activeTab },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try { const t = await error.context?.text(); msg = t || msg; } catch { /* ignore */ }
      }
      toast.error(`Erro ao carregar CRM: ${msg}`);
    } else {
      setData(data ?? {});
    }

    if (showLoader) setLoading(false);
    else setRefreshing(false);
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const p = data.platform;
  const a = data.automation;

  const conversionRate = p && p.totalUsers > 0
    ? ((p.paidOrders / p.totalUsers) * 100).toFixed(1)
    : "—";

  return (
    <AdminLayout>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "28px", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <p className="overline" style={{ color: "var(--gold)", marginBottom: "6px", fontSize: "9px" }}>Marketing</p>
            <h1 className="font-display" style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: 300, color: "var(--text-primary)" }}>CRM & Automação</h1>
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

        {/* Tab bar */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "22px", flexWrap: "wrap" }}>
          {(["overview", "sequences", "events", "tags"] as const).map(t => {
            const labels: Record<string, string> = { overview: "Visão Geral", sequences: "Sequências", events: "Eventos", tags: "Tags" };
            const active = activeTab === t;
            return (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className="font-label"
                style={{
                  padding: "7px 16px", borderRadius: "100px", fontSize: "9px",
                  letterSpacing: "0.16em", textTransform: "uppercase", cursor: "pointer",
                  border: `1px solid ${active ? "var(--gold)" : "var(--border-soft)"}`,
                  background: active ? "rgba(198,168,112,0.08)" : "transparent",
                  color: active ? "var(--gold)" : "var(--text-faint)",
                  transition: "all 0.2s",
                }}
              >{labels[t]}</button>
            );
          })}
        </div>

        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <>
            {loading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "12px" }}>
                {Array.from({length: 8}).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
              </div>
            ) : (
              <>
                {/* Platform metrics */}
                <div style={{ marginBottom: "8px" }}>
                  <p className="overline" style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.22em", marginBottom: "12px" }}>Plataforma</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "12px", marginBottom: "20px" }}>
                    <MetricCard label="Usuárias cadastradas"  value={p?.totalUsers ?? 0}    icon={Users}      color="var(--gold)"     />
                    <MetricCard label="Alunas com acesso"     value={p?.totalMembers ?? 0}   icon={UserCheck}  color="var(--sage)"     />
                    <MetricCard label="Pedidos pagos"         value={p?.paidOrders ?? 0}     icon={ShoppingBag} color="var(--lavender)" />
                    <MetricCard label="Pendentes"             value={p?.pendingOrders ?? 0}  icon={Clock}      color="var(--rose)"     />
                    <MetricCard
                      label="Receita 30 dias"
                      value={`R$ ${(p?.revenue30d ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                      icon={DollarSign}
                      color="var(--gold)"
                    />
                    <MetricCard
                      label="Conversão (usuária → compra)"
                      value={`${conversionRate}%`}
                      icon={TrendingUp}
                      color="var(--sage)"
                    />
                  </div>
                </div>

                {/* Automation metrics */}
                {data.error === "not_configured" ? (
                  <NotConfigured message={data.message} />
                ) : (
                  <div>
                    <p className="overline" style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.22em", marginBottom: "12px" }}>Automação de Marketing</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "12px" }}>
                      <MetricCard
                        label="Assinantes"
                        value={a?.subscribers ?? "—"}
                        icon={Mail}
                        color="var(--gold)"
                        sub={a?.subscribers ? "na base de contatos" : "sem dados"}
                      />
                      <MetricCard
                        label="Sequências ativas"
                        value={Array.isArray(a?.sequences) ? a.sequences.filter((s) => (s as Record<string,unknown>).status === "active" || (s as Record<string,unknown>).active === true).length : "—"}
                        icon={Zap}
                        color="var(--lavender)"
                      />
                      <MetricCard
                        label="Tags criadas"
                        value={Array.isArray(a?.tags) ? a.tags.length : "—"}
                        icon={Tag}
                        color="var(--rose)"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── Sequences ── */}
        {activeTab === "sequences" && (
          <>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[0,1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : data.error === "not_configured" ? (
              <NotConfigured message={data.message} />
            ) : !Array.isArray(a?.sequences) || a.sequences.length === 0 ? (
              <div className="card-dark" style={{ padding: "32px", textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: "var(--text-faint)" }}>Nenhuma sequência encontrada.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {a.sequences.map((seq: Record<string, unknown>, i: number) => {
                  const isActive = seq.status === "active" || seq.active === true;
                  return (
                    <div key={i} className="card-dark" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
                      <div style={{ width: "34px", height: "34px", borderRadius: "10px", flexShrink: 0, background: isActive ? "rgba(140,170,150,0.12)" : "rgba(198,168,112,0.07)", border: `1px solid ${isActive ? "rgba(140,170,150,0.30)" : "var(--border-soft)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Zap size={14} style={{ color: isActive ? "var(--sage)" : "var(--text-faint)" }} strokeWidth={1.5} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {String(seq.name ?? seq.title ?? "Sem nome")}
                        </p>
                        {seq.description && (
                          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {String(seq.description).slice(0, 80)}
                          </p>
                        )}
                      </div>
                      <span className={isActive ? "badge-sage" : "badge-gold"} style={{ fontSize: "7px", padding: "3px 10px", flexShrink: 0 }}>
                        {isActive ? "ATIVA" : "PAUSADA"}
                      </span>
                      {seq.subscribers_count !== undefined && (
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>
                          {Number(seq.subscribers_count).toLocaleString()} assinantes
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Events ── */}
        {activeTab === "events" && (
          <>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {Array.from({length: 8}).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : data.error === "not_configured" ? (
              <NotConfigured message={data.message} />
            ) : !Array.isArray(a?.recentEvents) || a.recentEvents.length === 0 ? (
              <div className="card-dark" style={{ padding: "32px", textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: "var(--text-faint)" }}>Nenhum evento recente.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {a.recentEvents.map((ev: Record<string, unknown>, i: number) => (
                  <div key={i} className="card-dark" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--gold)", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                        <span className="badge-gold" style={{ fontSize: "7px", padding: "2px 8px" }}>
                          {String(ev.event ?? ev.name ?? "evento")}
                        </span>
                        <p style={{ fontSize: "12px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {String(ev.email ?? ev.subscriber_email ?? "—")}
                        </p>
                      </div>
                    </div>
                    <span style={{ fontSize: "10px", color: "var(--text-faint)", flexShrink: 0 }}>
                      {ev.created_at ? new Date(ev.created_at as string).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Tags ── */}
        {activeTab === "tags" && (
          <>
            {loading ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {Array.from({length: 16}).map((_, i) => <Skeleton key={i} className="h-7 w-24 rounded-full" />)}
              </div>
            ) : data.error === "not_configured" ? (
              <NotConfigured message={data.message} />
            ) : !Array.isArray(a?.tags) || a.tags.length === 0 ? (
              <div className="card-dark" style={{ padding: "32px", textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: "var(--text-faint)" }}>Nenhuma tag encontrada.</p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>
                  {a.tags.length} {a.tags.length === 1 ? "tag" : "tags"} na base
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {a.tags.map((tag: Record<string, unknown>, i: number) => (
                    <div
                      key={i}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "7px",
                        padding: "6px 14px", borderRadius: "100px",
                        background: "rgba(198,168,112,0.07)", border: "1px solid var(--border-soft)",
                      }}
                    >
                      <Activity size={9} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                      <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontFamily: "Montserrat, sans-serif" }}>
                        {String(tag.name ?? tag.tag ?? tag)}
                      </span>
                      {tag.count !== undefined && (
                        <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>
                          {Number(tag.count)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </AdminLayout>
  );
}
