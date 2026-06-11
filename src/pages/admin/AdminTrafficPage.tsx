/**
 * AdminTrafficPage — Painel de Tráfego Pago
 * Meta Ads (Facebook/Instagram) + Google Ads — dados reais via APIs oficiais.
 */
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw, TrendingUp, Eye, MousePointer, DollarSign,
  Zap, AlertCircle, BarChart2, Target, Percent,
} from "lucide-react";

/* ─────────── Types ─────────── */
interface AdsSummary {
  spend: string | number; impressions: number; clicks: number;
  ctr: string | number; cpc: string | number; conversions: string | number;
  conversionValue?: string | number; roas: string | number;
  cpm?: string | number; reach?: number; frequency?: string | number;
  purchases?: number; leads?: number;
}
interface Campaign {
  id: string; name: string; status: string; type?: string;
  spend: string; impressions: number; clicks: number;
  ctr: string; cpc: string; conversions: string;
  conversionValue?: string; roas: string; costPerConversion?: string;
  objective?: string;
}
interface MetaData {
  account?: { name: string; currency: string; status: number; totalSpent: string };
  summary?: AdsSummary; campaigns?: Campaign[];
  dailyData?: { date_start?: string; spend?: string; impressions?: string; clicks?: string; reach?: string }[];
  dateRange?: { since: string; until: string };
  error?: string; message?: string;
}
interface GoogleData {
  summary?: AdsSummary; campaigns?: Campaign[];
  dateRange?: { since: string; until: string };
  error?: string; message?: string;
}
interface AdsData { meta?: MetaData; google?: GoogleData; dateRange?: string; }

type DateRange = "last_7d" | "last_30d" | "this_month" | "last_month";
type Platform  = "all" | "meta" | "google";

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "last_7d",     label: "7 dias" },
  { value: "last_30d",   label: "30 dias" },
  { value: "this_month",  label: "Este mês" },
  { value: "last_month",  label: "Mês passado" },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:  "var(--sage)", PAUSED: "var(--gold)", ENABLED: "var(--sage)",
  REMOVED: "var(--rose)", ENDED: "var(--text-faint)", BUDGET_PAUSED: "var(--rose)",
};

/* ─────────── Not configured ─────────── */
function NotConfigured({ platform, message }: { platform: string; message?: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
      padding: "40px 24px", borderRadius: "var(--r-xl)",
      border: "1px dashed var(--border-soft)", textAlign: "center",
      background: "var(--bg-surface-2)",
    }}>
      <AlertCircle size={22} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
      <div>
        <p style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: 500, marginBottom: "6px" }}>
          {platform} não configurado
        </p>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6, maxWidth: "380px" }}>
          {message ?? `Configure as credenciais de API do ${platform} nos Secrets do Supabase.`}
        </p>
      </div>
    </div>
  );
}

/* ─────────── KPI card ─────────── */
function KPICard({ label, value, icon: Icon, color = "var(--gold)", sub, format = "number" }: {
  label: string; value: string | number | undefined; icon: React.ElementType;
  color?: string; sub?: string; format?: "number" | "currency" | "percent" | "raw";
}) {
  const display = () => {
    if (value === undefined || value === null || value === "—") return "—";
    const n = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(n)) return String(value);
    if (format === "currency") return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (format === "percent") return `${n.toFixed(2)}%`;
    if (format === "number") return n.toLocaleString("pt-BR");
    return String(value);
  };

  return (
    <div className="card-dark" style={{ padding: "clamp(14px,2.5vw,20px) clamp(12px,2vw,18px)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "10px" }}>
        <p className="font-label" style={{ fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</p>
        <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: `${color}12`, border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={11} style={{ color }} strokeWidth={1.5} />
        </div>
      </div>
      <p className="font-display" style={{ fontSize: "clamp(18px,2.8vw,26px)", fontWeight: 300, color, lineHeight: 1 }}>
        {display()}
      </p>
      {sub && <p style={{ fontSize: "10px", color: "var(--text-faint)", marginTop: "5px" }}>{sub}</p>}
    </div>
  );
}

/* ─────────── Campaign table row ─────────── */
function CampaignRow({ c, currency }: { c: Campaign; currency?: string }) {
  const statusColor = STATUS_COLORS[c.status] ?? "var(--text-faint)";
  const roasNum = parseFloat(String(c.roas));
  const roasColor = roasNum >= 3 ? "var(--sage)" : roasNum >= 1 ? "var(--gold)" : "var(--rose)";
  const curr = currency ?? "R$";

  return (
    <tr>
      <td style={{ padding: "12px 14px" }}>
        <div>
          <p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, marginBottom: "2px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
          {c.type && <p style={{ fontSize: "10px", color: "var(--text-faint)" }}>{c.type}</p>}
        </div>
      </td>
      <td style={{ padding: "12px 14px" }}>
        <span className="font-label" style={{ fontSize: "8px", padding: "3px 9px", borderRadius: "100px", background: `${statusColor}14`, border: `1px solid ${statusColor}30`, color: statusColor, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {c.status}
        </span>
      </td>
      <td style={{ padding: "12px 14px" }}>
        <span className="font-display" style={{ fontSize: "16px", color: "var(--gold)", fontWeight: 300 }}>
          {curr} {parseFloat(String(c.spend)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
      </td>
      <td style={{ padding: "12px 14px", color: "var(--text-secondary)", fontSize: "13px" }}>
        {parseInt(String(c.impressions)).toLocaleString("pt-BR")}
      </td>
      <td style={{ padding: "12px 14px", color: "var(--text-secondary)", fontSize: "13px" }}>
        {parseInt(String(c.clicks)).toLocaleString("pt-BR")}
      </td>
      <td style={{ padding: "12px 14px", color: "var(--text-secondary)", fontSize: "13px" }}>
        {parseFloat(String(c.ctr)).toFixed(2)}%
      </td>
      <td style={{ padding: "12px 14px", color: "var(--text-secondary)", fontSize: "13px" }}>
        {curr} {parseFloat(String(c.cpc)).toFixed(2)}
      </td>
      <td style={{ padding: "12px 14px" }}>
        <span style={{ fontSize: "13px", color: roasColor, fontWeight: 500 }}>
          {roasNum.toFixed(2)}x
        </span>
      </td>
      <td style={{ padding: "12px 14px", color: "var(--text-secondary)", fontSize: "13px" }}>
        {parseFloat(String(c.conversions)).toFixed(1)}
      </td>
    </tr>
  );
}

/* ─────────── Main ─────────── */
export default function AdminTrafficPage() {
  const [data,       setData]       = useState<AdsData>({});
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange,  setDateRange]  = useState<DateRange>("last_30d");
  const [platform,   setPlatform]   = useState<Platform>("all");

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("ads-stats", {
      body: { platform, dateRange },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) { try { const t = await error.context?.text(); msg = t || msg; } catch { /* ignore */ } }
      toast.error(`Erro ao carregar dados: ${msg}`);
    } else {
      setData(data ?? {});
    }

    if (showLoader) setLoading(false);
    else setRefreshing(false);
  }, [dateRange, platform]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const meta   = data.meta;
  const google = data.google;

  // Combined totals (when both platforms configured)
  const totalSpend = (parseFloat(String(meta?.summary?.spend ?? 0)) + parseFloat(String(google?.summary?.spend ?? 0)));
  const totalConvValue = (parseFloat(String(meta?.summary?.conversionValue ?? 0)) + parseFloat(String(google?.summary?.conversionValue ?? 0)));
  const combinedROAS = totalSpend > 0 ? (totalConvValue / totalSpend).toFixed(2) : "—";

  return (
    <AdminLayout>
      <div style={{ maxWidth: "1060px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <p className="overline" style={{ color: "var(--gold)", marginBottom: "6px", fontSize: "9px" }}>Tráfego Pago</p>
            <h1 className="font-display" style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: 300, color: "var(--text-primary)" }}>Gestão de Anúncios</h1>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => fetchData(false)}
              disabled={refreshing}
              className="btn-ghost"
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 14px" }}
            >
              <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.14em" }}>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "22px" }}>
          {/* Platform filter */}
          <div style={{ display: "flex", gap: "6px" }}>
            {([
              { value: "all" as Platform, label: "Todos" },
              { value: "meta" as Platform, label: "Meta" },
              { value: "google" as Platform, label: "Google" },
            ]).map(({ value, label }) => {
              const active = platform === value;
              return (
                <button
                  key={value}
                  onClick={() => setPlatform(value)}
                  className="font-label"
                  style={{
                    padding: "7px 16px", borderRadius: "100px", fontSize: "9px",
                    letterSpacing: "0.16em", textTransform: "uppercase",
                    border: `1px solid ${active ? "var(--gold)" : "var(--border-soft)"}`,
                    background: active ? "rgba(198,168,112,0.08)" : "transparent",
                    color: active ? "var(--gold)" : "var(--text-muted)",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >{label}</button>
              );
            })}
          </div>

          {/* Date range */}
          <div style={{ display: "flex", gap: "6px" }}>
            {DATE_RANGES.map(({ value, label }) => {
              const active = dateRange === value;
              return (
                <button
                  key={value}
                  onClick={() => setDateRange(value)}
                  className="font-label"
                  style={{
                    padding: "7px 14px", borderRadius: "100px", fontSize: "9px",
                    letterSpacing: "0.14em", textTransform: "uppercase",
                    border: `1px solid ${active ? "var(--lavender)" : "var(--border-soft)"}`,
                    background: active ? "rgba(164,158,208,0.10)" : "transparent",
                    color: active ? "var(--lavender)" : "var(--text-muted)",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >{label}</button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "12px" }}>
              {Array.from({length: 8}).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
            </div>
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        ) : (
          <>
            {/* Combined ROAS strip (when both platforms active) */}
            {meta?.summary && google?.summary && !meta.error && !google.error && (
              <div style={{
                display: "flex", gap: "24px", padding: "14px 20px", marginBottom: "16px",
                borderRadius: "var(--r-xl)", background: "rgba(198,168,112,0.06)",
                border: "1px solid rgba(198,168,112,0.14)", alignItems: "center", flexWrap: "wrap",
              }}>
                <div style={{ flex: 1 }}>
                  <p className="font-label" style={{ fontSize: "8px", letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>Investimento total combinado</p>
                  <p className="font-display" style={{ fontSize: "24px", color: "var(--gold)", fontWeight: 300, lineHeight: 1 }}>
                    R$ {totalSpend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="font-label" style={{ fontSize: "8px", letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>ROAS combinado</p>
                  <p className="font-display" style={{ fontSize: "24px", color: parseFloat(combinedROAS) >= 3 ? "var(--sage)" : "var(--gold)", fontWeight: 300, lineHeight: 1 }}>
                    {combinedROAS}x
                  </p>
                </div>
                <div>
                  <p className="font-label" style={{ fontSize: "8px", letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>Receita gerada (atrib.)</p>
                  <p className="font-display" style={{ fontSize: "24px", color: "var(--sage)", fontWeight: 300, lineHeight: 1 }}>
                    R$ {totalConvValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}

            {/* ── META ADS ── */}
            {(platform === "all" || platform === "meta") && (
              <section style={{ marginBottom: "32px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(24,119,242,0.15)", border: "1px solid rgba(24,119,242,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Target size={13} style={{ color: "#1877f2" }} strokeWidth={1.5} />
                  </div>
                  <p className="font-label" style={{ fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "#1877f2" }}>Meta Ads</p>
                  {meta?.account?.name && (
                    <span style={{ fontSize: "11px", color: "var(--text-faint)" }}>— {meta.account.name}</span>
                  )}
                </div>

                {meta?.error === "not_configured" ? (
                  <NotConfigured platform="Meta Ads" message={meta.message} />
                ) : meta?.error ? (
                  <div className="card-dark" style={{ padding: "16px", color: "var(--rose)" }}>
                    <p style={{ fontSize: "13px" }}>Erro: {meta.error}</p>
                  </div>
                ) : meta?.summary ? (
                  <>
                    {/* KPI grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "10px", marginBottom: "16px" }}>
                      <KPICard label="Investimento" value={meta.summary.spend} icon={DollarSign} color="var(--gold)" format="currency" />
                      <KPICard label="Impressões"   value={meta.summary.impressions} icon={Eye} color="var(--lavender)" />
                      <KPICard label="Cliques"      value={meta.summary.clicks} icon={MousePointer} color="var(--sage)" />
                      <KPICard label="CTR"          value={meta.summary.ctr} icon={Percent} color="var(--gold)" format="percent" />
                      <KPICard label="CPC"          value={meta.summary.cpc} icon={DollarSign} color="var(--rose)" format="currency" />
                      <KPICard label="Compras"      value={meta.summary.purchases} icon={Zap} color="var(--sage)" />
                      <KPICard label="ROAS"         value={`${meta.summary.roas}x`} icon={TrendingUp} color={parseFloat(String(meta.summary.roas)) >= 3 ? "var(--sage)" : "var(--gold)"} format="raw" />
                      <KPICard label="Alcance"      value={meta.summary.reach} icon={BarChart2} color="var(--lavender)" />
                    </div>

                    {/* Campaign table */}
                    {(meta.campaigns ?? []).length > 0 && (
                      <div className="card-dark" style={{ overflow: "hidden" }}>
                        <p className="font-label" style={{ fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", padding: "14px 16px 0" }}>Campanhas Meta Ads</p>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                {["Campanha", "Status", "Gasto", "Impr.", "Cliques", "CTR", "CPC", "ROAS", "Conv."].map(h => (
                                  <th key={h} className="font-label" style={{ textAlign: "left", padding: "10px 14px", fontSize: "7.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-faint)", fontWeight: 400 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {meta.campaigns!.map((c, i) => (
                                <tr key={c.id ?? i} style={{ borderBottom: i < meta.campaigns!.length - 1 ? "1px solid rgba(198,168,112,0.05)" : "none" }}>
                                  <CampaignRow c={c} currency="R$" />
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </section>
            )}

            {/* ── GOOGLE ADS ── */}
            {(platform === "all" || platform === "google") && (
              <section>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(66,133,244,0.12)", border: "1px solid rgba(66,133,244,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <BarChart2 size={13} style={{ color: "#4285f4" }} strokeWidth={1.5} />
                  </div>
                  <p className="font-label" style={{ fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "#4285f4" }}>Google Ads</p>
                </div>

                {google?.error === "not_configured" ? (
                  <NotConfigured platform="Google Ads" message={google.message} />
                ) : google?.error ? (
                  <div className="card-dark" style={{ padding: "16px", color: "var(--rose)" }}>
                    <p style={{ fontSize: "13px" }}>Erro: {google.error}</p>
                  </div>
                ) : google?.summary ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "10px", marginBottom: "16px" }}>
                      <KPICard label="Investimento"  value={google.summary.spend} icon={DollarSign} color="var(--gold)" format="currency" />
                      <KPICard label="Impressões"    value={google.summary.impressions} icon={Eye} color="var(--lavender)" />
                      <KPICard label="Cliques"       value={google.summary.clicks} icon={MousePointer} color="var(--sage)" />
                      <KPICard label="CTR"           value={google.summary.ctr} icon={Percent} color="var(--gold)" format="percent" />
                      <KPICard label="CPC"           value={google.summary.cpc} icon={DollarSign} color="var(--rose)" format="currency" />
                      <KPICard label="Conversões"    value={google.summary.conversions} icon={Zap} color="var(--sage)" />
                      <KPICard label="ROAS"          value={`${google.summary.roas}x`} icon={TrendingUp} color={parseFloat(String(google.summary.roas)) >= 3 ? "var(--sage)" : "var(--gold)"} format="raw" />
                      <KPICard label="Val. de Conv." value={google.summary.conversionValue} icon={BarChart2} color="var(--lavender)" format="currency" />
                    </div>

                    {(google.campaigns ?? []).length > 0 && (
                      <div className="card-dark" style={{ overflow: "hidden" }}>
                        <p className="font-label" style={{ fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", padding: "14px 16px 0" }}>Campanhas Google Ads</p>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                {["Campanha", "Status", "Gasto", "Impr.", "Cliques", "CTR", "CPC", "ROAS", "Conv."].map(h => (
                                  <th key={h} className="font-label" style={{ textAlign: "left", padding: "10px 14px", fontSize: "7.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-faint)", fontWeight: 400 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {google.campaigns!.map((c, i) => (
                                <tr key={c.id ?? i} style={{ borderBottom: i < google.campaigns!.length - 1 ? "1px solid rgba(198,168,112,0.05)" : "none" }}>
                                  <CampaignRow c={c} currency="R$" />
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </section>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </AdminLayout>
  );
}
