/**
 * AdminEventsPage — Funil de Conversão do Mapa do Poder
 * Busca eventos via edge function crm-stats?view=funnel:
 *  mapa.started → mapa.step_completed → mapa.lead_captured → mapa.finished
 * Exibe: cards de KPI, gráfico de barras por etapa, taxa de conversão, leads recentes.
 */
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";
import {
  RefreshCw, TrendingUp, Users, Sparkles,
  Target, AlertCircle, ChevronRight, Clock,
  QrCode, Mail, CheckCircle2, Star,
} from "lucide-react";

/* ─────────────────────────────────
   TYPES
───────────────────────────────── */
interface FunnelStep {
  id: string;
  label: string;
  count: number;
  pct: number;
  color: "gold" | "lavender" | "sage" | "rose";
}

interface StepBar {
  step: number;
  count: number;
  pct: number;
}

interface FunnelData {
  funnel: FunnelStep[];
  steps: StepBar[];
  sources: Record<string, number>;
  dbLeadCount: number;
  recentLeads: { id: string; created_at: string }[];
  conversionRate: number;
  totalStarted: number;
}

interface ApiResponse {
  funnel?: FunnelStep[];
  steps?: StepBar[];
  sources?: Record<string, number>;
  dbLeadCount?: number;
  recentLeads?: { id: string; created_at: string }[];
  conversionRate?: number;
  totalStarted?: number;
  error?: string;
  message?: string;
}

/* ─────────────────────────────────
   HELPERS
───────────────────────────────── */
const COLOR_MAP: Record<FunnelStep["color"], string> = {
  gold:     "var(--gold)",
  lavender: "var(--lavender)",
  sage:     "var(--sage)",
  rose:     "var(--rose)",
};

const STEP_LABELS: Record<number, string> = {
  1: "A Trava",
  2: "A Origem",
  3: "O Vínculo",
  4: "A Força",
  5: "O Desejo",
  6: "O Corpo",
  7: "O Vínculo Sagrado",
  8: "A Ativação",
};

const STEP_SYMBOLS: Record<number, string> = {
  1: "✦", 2: "◎", 3: "∞", 4: "△",
  5: "❋", 6: "⊕", 7: "♥", 8: "✶",
};

function timeAgoShort(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

/* ─────────────────────────────────
   SKELETON
───────────────────────────────── */
function Sk({ w = "100%", h = "14px", r = "8px" }: {
  w?: string; h?: string; r?: string;
}) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, flexShrink: 0 }} />;
}

function FunnelSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "12px" }}>
        {[1,2,3,4].map((i) => (
          <div key={i} className="card-dark" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
              <Sk w="70%" h="11px" />
              <Sk w="28px" h="28px" r="50%" />
            </div>
            <Sk w="50%" h="28px" r="6px" style={{ marginBottom: "8px" }} />
            <Sk w="40px" h="4px" r="100px" />
          </div>
        ))}
      </div>
      <div className="card-dark" style={{ padding: "24px" }}>
        <Sk w="40%" h="14px" style={{ marginBottom: "20px" }} />
        {[1,2,3,4,5,6,7,8].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
            <Sk w="80px" h="12px" />
            <Sk h="28px" r="6px" style={{ flex: 1 }} />
            <Sk w="36px" h="12px" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────
   KPI CARD
───────────────────────────────── */
function KPICard({
  label, value, icon: Icon, color, sub, badge,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
  badge?: string;
}) {
  return (
    <div className="card-dark card-lift" style={{ padding: "clamp(16px,2.5vw,22px)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "14px" }}>
        <p className="font-label" style={{ fontSize: "8px", letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--text-muted)", lineHeight: 1.4 }}>
          {label}
        </p>
        <div style={{
          width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
          background: `${color}14`, border: `1px solid ${color}28`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={13} style={{ color }} strokeWidth={1.5} />
        </div>
      </div>

      <p className="font-display" style={{
        fontSize: "clamp(22px,3.5vw,34px)", fontWeight: 300,
        color, lineHeight: 1, marginBottom: "6px",
      }}>
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </p>

      {sub && (
        <p style={{ fontSize: "11px", color: "var(--text-faint)", lineHeight: 1.5 }}>{sub}</p>
      )}
      {badge && (
        <span className="badge-gold" style={{ marginTop: "8px", fontSize: "7px", display: "inline-flex" }}>
          {badge}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────
   FUNNEL BAR (horizontal step)
───────────────────────────────── */
function FunnelBar({ step }: { step: FunnelStep; maxCount: number }) {
  const color = COLOR_MAP[step.color];
  const ICONS: Record<string, React.ElementType> = {
    "mapa.started":       QrCode,
    "mapa.step_completed": Star,
    "mapa.lead_captured": Mail,
    "mapa.finished":      CheckCircle2,
  };
  const Icon = ICONS[step.id] ?? Target;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 0" }}>
      {/* Icon */}
      <div style={{
        width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
        background: `${color}12`, border: `1px solid ${color}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={15} style={{ color }} strokeWidth={1.5} />
      </div>

      {/* Label + bar */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
            {step.label}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="font-display" style={{ fontSize: "18px", fontWeight: 300, color, lineHeight: 1 }}>
              {step.count.toLocaleString("pt-BR")}
            </span>
            <span style={{
              fontSize: "9px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.14em",
              padding: "3px 9px", borderRadius: "100px",
              background: `${color}12`, color,
              border: `1px solid ${color}20`,
              minWidth: "42px", textAlign: "center",
            }}>
              {step.pct}%
            </span>
          </div>
        </div>
        <div className="progress-bar thick">
          <div
            className="progress-bar-fill"
            style={{
              width: `${Math.min(step.pct, 100)}%`,
              background: `linear-gradient(90deg, ${color}88, ${color})`,
              transition: "width 1.1s var(--ease-out)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────
   STEP BAR CHART (vertical bars)
───────────────────────────────── */
function StepBarChart({ steps }: { steps: StepBar[] }) {
  const maxCount = Math.max(...steps.map((s) => s.count), 1);

  return (
    <div className="card-dark" style={{ padding: "clamp(18px,3vw,26px)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "22px", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <p className="overline" style={{ color: "var(--lavender)", fontSize: "8px", marginBottom: "4px" }}>Jornada</p>
          <h3 style={{ fontSize: "16px", color: "var(--text-primary)", fontWeight: 500 }}>
            Progresso por etapa
          </h3>
        </div>
        <p style={{ fontSize: "11px", color: "var(--text-faint)" }}>
          Quantas pessoas completaram cada etapa
        </p>
      </div>

      {/* Mobile: horizontal bars */}
      <div className="md:hidden" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {steps.map((s) => (
          <div key={s.step} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0, background: "rgba(164,158,208,0.10)", border: "1px solid rgba(164,158,208,0.20)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "10px", color: "var(--lavender)" }}>{STEP_SYMBOLS[s.step]}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {STEP_LABELS[s.step]}
                </span>
                <span style={{ fontSize: "11px", fontFamily: "Montserrat, sans-serif", color: "var(--lavender)", fontWeight: 600, marginLeft: "8px", flexShrink: 0 }}>
                  {s.count}
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${maxCount > 0 ? (s.count / maxCount) * 100 : 0}%`,
                    background: "linear-gradient(90deg, rgba(164,158,208,0.6), var(--lavender))",
                    transition: "width 1s var(--ease-out)",
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: grouped vertical bars */}
      <div className="hidden md:block">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gap: "6px",
          alignItems: "end",
          height: "160px",
        }}>
          {steps.map((s) => {
            const heightPct = maxCount > 0 ? (s.count / maxCount) * 100 : 0;
            const barH = Math.max(4, (heightPct / 100) * 140);
            const isTop = s.count === maxCount && maxCount > 0;

            return (
              <div
                key={s.step}
                style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "flex-end",
                  height: "160px", gap: "4px",
                  position: "relative",
                }}
              >
                {/* Count label above bar */}
                {s.count > 0 && (
                  <span style={{
                    position: "absolute",
                    bottom: `${barH + 28}px`,
                    fontSize: "11px", fontFamily: "Montserrat, sans-serif",
                    fontWeight: 600, color: "var(--lavender)",
                    whiteSpace: "nowrap",
                  }}>
                    {s.count}
                  </span>
                )}

                {/* Bar */}
                <div
                  title={`Etapa ${s.step}: ${STEP_LABELS[s.step]} — ${s.count} completaram`}
                  style={{
                    width: "100%",
                    height: `${barH}px`,
                    borderRadius: "8px 8px 4px 4px",
                    background: isTop
                      ? "linear-gradient(180deg, var(--gold), rgba(198,168,112,0.7))"
                      : "linear-gradient(180deg, var(--lavender), rgba(164,158,208,0.5))",
                    transition: "height 1s var(--ease-out)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Shimmer highlight */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: "40%",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 100%)",
                    borderRadius: "inherit",
                  }} />
                </div>

                {/* Step symbol + number */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "10px", color: "var(--lavender)", lineHeight: 1 }}>
                    {STEP_SYMBOLS[s.step]}
                  </div>
                  <div style={{ fontSize: "8px", fontFamily: "Montserrat, sans-serif", color: "var(--text-faint)", letterSpacing: "0.08em" }}>
                    E{s.step}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "6px", marginTop: "8px" }}>
          {steps.map((s) => (
            <div key={s.step} style={{ textAlign: "center" }}>
              <p style={{
                fontSize: "9px", color: "var(--text-faint)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                fontFamily: "Montserrat, sans-serif",
              }} title={STEP_LABELS[s.step]}>
                {STEP_LABELS[s.step].split(" ").slice(-1)[0]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────
   DROP-OFF FUNNEL VISUALIZATION
───────────────────────────────── */
function ConversionFunnelViz({ funnel }: { funnel: FunnelStep[] }) {
  return (
    <div className="card-dark" style={{ padding: "clamp(18px,3vw,26px)" }}>
      <div style={{ marginBottom: "20px" }}>
        <p className="overline" style={{ color: "var(--gold)", fontSize: "8px", marginBottom: "4px" }}>Funil de Conversão</p>
        <h3 style={{ fontSize: "16px", color: "var(--text-primary)", fontWeight: 500 }}>
          Mapa do Poder — Jornada Completa
        </h3>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {funnel.map((step, idx) => (
          <div key={step.id}>
            <FunnelBar step={step} maxCount={funnel[0]?.count ?? 1} />
            {/* Drop-off indicator between steps */}
            {idx < funnel.length - 1 && funnel[0].count > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "4px 0 4px 50px",
              }}>
                <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
                {(() => {
                  const current = step.count;
                  const next    = funnel[idx + 1].count;
                  const dropped = current - next;
                  const dropPct = current > 0 ? ((dropped / current) * 100).toFixed(0) : "0";
                  const isGood  = Number(dropPct) < 30;
                  return dropped > 0 ? (
                    <span style={{
                      fontSize: "9px", fontFamily: "Montserrat, sans-serif",
                      color: isGood ? "var(--sage)" : "var(--rose)",
                      letterSpacing: "0.10em", whiteSpace: "nowrap",
                      padding: "2px 8px", borderRadius: "100px",
                      background: isGood ? "rgba(140,170,150,0.08)" : "rgba(201,154,170,0.08)",
                      border: `1px solid ${isGood ? "rgba(140,170,150,0.20)" : "rgba(201,154,170,0.20)"}`,
                    }}>
                      -{dropPct}% saíram
                    </span>
                  ) : null;
                })()}
                <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────
   SOURCES CARD
───────────────────────────────── */
function SourcesCard({ sources }: { sources: Record<string, number> }) {
  const total = Object.values(sources).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(sources).sort(([, a], [, b]) => b - a);

  return (
    <div className="card-dark" style={{ padding: "clamp(16px,2.5vw,22px)" }}>
      <div style={{ marginBottom: "16px" }}>
        <p className="overline" style={{ color: "var(--rose)", fontSize: "8px", marginBottom: "4px" }}>
          Origem dos acessos
        </p>
        <h3 style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: 500 }}>
          QR Codes por evento
        </h3>
      </div>
      {sorted.length === 0 ? (
        <p style={{ fontSize: "12px", color: "var(--text-faint)", textAlign: "center", padding: "16px 0" }}>
          Sem dados de origem ainda.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {sorted.map(([src, count]) => {
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={src} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0, background: "rgba(201,154,170,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <QrCode size={13} style={{ color: "var(--rose)" }} strokeWidth={1.5} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {src}
                    </span>
                    <span style={{ fontSize: "11px", fontFamily: "Montserrat, sans-serif", color: "var(--text-muted)", marginLeft: "8px", flexShrink: 0 }}>
                      {count} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="progress-bar thin">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: "linear-gradient(90deg, rgba(201,154,170,0.5), var(--rose))",
                        transition: "width 0.9s var(--ease-out)",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────
   RECENT LEADS
───────────────────────────────── */
function RecentLeadsCard({ leads, dbCount }: { leads: { id: string; created_at: string }[]; dbCount: number }) {
  return (
    <div className="card-dark" style={{ padding: "clamp(16px,2.5vw,22px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <p className="overline" style={{ color: "var(--sage)", fontSize: "8px", marginBottom: "4px" }}>Leads</p>
          <h3 style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: 500 }}>
            Cadastros recentes
          </h3>
        </div>
        <span className="badge-sage" style={{ fontSize: "8px" }}>
          {dbCount.toLocaleString("pt-BR")} total
        </span>
      </div>

      {leads.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <Mail size={20} style={{ color: "var(--text-faint)", margin: "0 auto 8px" }} strokeWidth={1.5} />
          <p style={{ fontSize: "12px", color: "var(--text-faint)" }}>Nenhum lead capturado ainda.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {leads.map((lead, i) => (
            <div key={lead.id} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 0",
              borderBottom: i < leads.length - 1 ? "1px solid var(--border-subtle)" : "none",
            }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                background: "rgba(140,170,150,0.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Mail size={12} style={{ color: "var(--sage)" }} strokeWidth={1.5} />
              </div>
              <p style={{ flex: 1, fontSize: "12px", color: "var(--text-muted)" }}>
                Lead #{(dbCount - i).toLocaleString("pt-BR")}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                <Clock size={10} style={{ color: "var(--text-faint)" }} strokeWidth={1.5} />
                <span style={{ fontSize: "10px", fontFamily: "Montserrat, sans-serif", color: "var(--text-faint)" }}>
                  {timeAgoShort(lead.created_at)} atrás
                </span>
              </div>
            </div>
          ))}
          {dbCount > leads.length && (
            <p style={{ fontSize: "11px", color: "var(--text-faint)", textAlign: "center", paddingTop: "8px" }}>
              + {(dbCount - leads.length).toLocaleString("pt-BR")} outros leads
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────
   NOT CONFIGURED STATE
───────────────────────────────── */
function NotConfigured({ message }: { message?: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: "14px",
      padding: "48px 24px", borderRadius: "var(--r-xl)",
      border: "1px dashed var(--border-soft)", textAlign: "center",
      background: "var(--bg-surface-2)",
    }}>
      <AlertCircle size={24} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
      <p className="font-display" style={{ fontSize: "20px", fontWeight: 300, color: "var(--text-primary)" }}>
        Dados indisponíveis
      </p>
      <p style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "380px", lineHeight: 1.7 }}>
        {message ?? "A chave de automação não está configurada. Verifique SEQUENZY_API_KEY nos Secrets do Cloud."}
      </p>
    </div>
  );
}

/* ─────────────────────────────────
   MAIN PAGE
───────────────────────────────── */
export default function AdminEventsPage() {
  const [data,       setData]       = useState<Partial<FunnelData>>({});
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [lastFetch,  setLastFetch]  = useState<Date | null>(null);

  const fetchFunnel = useCallback(async (showLoader = true) => {
    if (showLoader) { setLoading(true); setError(null); }
    else setRefreshing(true);

    const { data: { session } } = await supabase.auth.getSession();

    const { data: raw, error: fnErr } = await supabase.functions.invoke("crm-stats", {
      body: { view: "funnel" },
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined,
    });

    if (fnErr) {
      let msg = fnErr.message;
      if (fnErr instanceof FunctionsHttpError) {
        try { const t = await fnErr.context?.text(); msg = t || msg; } catch { /* ignore */ }
      }
      setError(msg);
      toast.error("Erro ao carregar funil.");
    } else {
      const res = raw as ApiResponse;
      if (res.error === "not_configured") {
        setError(res.message ?? "Automação não configurada.");
      } else {
        setData({
          funnel:        res.funnel        ?? [],
          steps:         res.steps         ?? [],
          sources:       res.sources        ?? {},
          dbLeadCount:   res.dbLeadCount    ?? 0,
          recentLeads:   res.recentLeads    ?? [],
          conversionRate: res.conversionRate ?? 0,
          totalStarted:  res.totalStarted   ?? 0,
        });
        setError(null);
        setLastFetch(new Date());
      }
    }

    if (showLoader) setLoading(false);
    else setRefreshing(false);
  }, []);

  useEffect(() => { fetchFunnel(); }, [fetchFunnel]);

  const { funnel = [], steps = [], sources = {}, dbLeadCount = 0, recentLeads = [], conversionRate = 0, totalStarted = 0 } = data;
  const started      = funnel[0]?.count ?? 0;
  const leadsCaptured = funnel[2]?.count ?? 0;
  const finished     = funnel[3]?.count ?? 0;
  const avgStepsPerUser = totalStarted > 0 && steps.length > 0
    ? (steps.reduce((s, st) => s + st.count, 0) / totalStarted).toFixed(1)
    : "—";

  return (
    <AdminLayout>
      <div style={{ maxWidth: "980px", margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "28px", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <p className="overline" style={{ color: "var(--gold)", marginBottom: "6px", fontSize: "9px" }}>
              Analytics
            </p>
            <h1 className="font-display" style={{
              fontSize: "clamp(26px,4vw,40px)", fontWeight: 300,
              color: "var(--text-primary)", lineHeight: 1.08,
            }}>
              Funil do Mapa do Poder
            </h1>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
              Rastreamento de conversão da jornada interativa por evento Sequenzy
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {lastFetch && (
              <span style={{ fontSize: "10px", fontFamily: "Montserrat, sans-serif", color: "var(--text-faint)", letterSpacing: "0.08em" }}>
                Atualizado {timeAgoShort(lastFetch.toISOString())} atrás
              </span>
            )}
            <button
              onClick={() => fetchFunnel(false)}
              disabled={refreshing || loading}
              className="btn-ghost"
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 16px" }}
            >
              <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.15em" }}>
                Atualizar
              </span>
            </button>
          </div>
        </div>

        {/* ── Link breadcrumb ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "24px" }}>
          <QrCode size={12} style={{ color: "var(--text-faint)" }} strokeWidth={1.5} />
          <span style={{ fontSize: "11px", color: "var(--text-faint)", fontFamily: "Montserrat, sans-serif" }}>
            Página rastreada:
          </span>
          <a
            href="https://despertarespiral.com/mapa"
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "11px", color: "var(--gold)", fontFamily: "Montserrat, sans-serif", textDecoration: "none", display: "flex", alignItems: "center", gap: "3px" }}
          >
            despertarespiral.com/mapa
            <ChevronRight size={10} />
          </a>
          <span style={{ fontSize: "9px", color: "var(--text-faint)", marginLeft: "4px" }}>
            (acesso via QR code exclusivo)
          </span>
        </div>

        {loading ? (
          <FunnelSkeleton />
        ) : error ? (
          <NotConfigured message={error} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

            {/* ── KPI Cards ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
              <KPICard
                label="Total iniciaram"
                value={started}
                icon={Sparkles}
                color="var(--gold)"
                sub="clicaram em Iniciar"
              />
              <KPICard
                label="Leads capturados"
                value={leadsCaptured}
                icon={Mail}
                color="var(--sage)"
                sub={`${dbLeadCount} no banco de dados`}
                badge={started > 0 ? `${((leadsCaptured / started) * 100).toFixed(0)}% de conversão` : undefined}
              />
              <KPICard
                label="Finalizaram"
                value={finished}
                icon={CheckCircle2}
                color="var(--lavender)"
                sub="completaram a jornada"
              />
              <KPICard
                label="Taxa de conclusão"
                value={`${conversionRate}%`}
                icon={TrendingUp}
                color={conversionRate >= 50 ? "var(--sage)" : conversionRate >= 25 ? "var(--gold)" : "var(--rose)"}
                sub="iniciou → finalizou"
              />
              <KPICard
                label="Etapas por usuária"
                value={avgStepsPerUser}
                icon={Star}
                color="var(--rose)"
                sub="média de etapas completadas"
              />
              <KPICard
                label="Total de leads (DB)"
                value={dbLeadCount}
                icon={Users}
                color="var(--gold)"
                sub="registros em launch_waitlist"
              />
            </div>

            {/* ── Conversion funnel (horizontal bars) ── */}
            {funnel.length > 0 && <ConversionFunnelViz funnel={funnel} />}

            {/* ── Step bar chart ── */}
            {steps.length > 0 && <StepBarChart steps={steps} />}

            {/* ── Bottom grid: Sources + Recent Leads ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
              <SourcesCard sources={sources} />
              <RecentLeadsCard leads={recentLeads} dbCount={dbLeadCount} />
            </div>

            {/* ── No data state ── */}
            {started === 0 && (
              <div className="card-dark" style={{ padding: "clamp(32px,5vw,56px) 24px", textAlign: "center" }}>
                <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(198,168,112,0.08)", border: "1px solid rgba(198,168,112,0.18)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                  <Target size={24} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                </div>
                <h3 className="font-display" style={{ fontSize: "22px", fontWeight: 300, color: "var(--text-primary)", marginBottom: "10px" }}>
                  Nenhum dado ainda
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.75, maxWidth: "400px", margin: "0 auto 20px" }}>
                  Os dados de funil aparecem assim que alguém escaneia o QR code do evento e inicia o Mapa do Poder.
                  Certifique-se que o Sequenzy está configurado com a chave <code style={{ fontSize: "12px", color: "var(--gold)", background: "rgba(198,168,112,0.08)", padding: "2px 6px", borderRadius: "4px" }}>SEQUENZY_API_KEY</code>.
                </p>
                <a href="/mapadopoder?src=preview" target="_blank" rel="noopener noreferrer" className="btn-outline-gold" style={{ fontSize: "9px" }}>
                  Testar Mapa do Poder <ChevronRight size={12} />
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </AdminLayout>
  );
}
