/**
 * AdminWaitlistPage — Manage pre-launch waitlist entries
 * Shows: total count, table of entries, export CSV, delete
 */
import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { Users, Download, Trash2, Search, RefreshCw, Phone, Mail, Calendar } from "lucide-react";
import { toast } from "sonner";

interface WaitlistRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  source: string | null;
  created_at: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Sk({ w = "100%", h = "14px", r = "8px" }: { w?: string; h?: string; r?: string }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r }} />;
}

export default function AdminWaitlistPage() {
  const [rows,     setRows]     = useState<WaitlistRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("launch_waitlist")
      .select("id, name, email, phone, source, created_at")
      .order("created_at", { ascending: false });
    if (error) { toast.error("Erro ao carregar lista."); console.error(error); }
    else setRows((data ?? []) as WaitlistRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (r.phone ?? "").includes(q);
  });

  /* ── Export CSV ── */
  const exportCSV = () => {
    const header = "Nome,Email,Telefone,Fonte,Data\n";
    const body = rows.map((r) =>
      [r.name, r.email, r.phone ?? "", r.source ?? "", formatDate(r.created_at)]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(",")
    ).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `waitlist_${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    toast.success("CSV exportado.");
  };

  /* ── Delete single row ── */
  const deleteRow = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from("launch_waitlist").delete().eq("id", id);
    setDeleting(null);
    if (error) { toast.error("Erro ao remover."); return; }
    setRows((p) => p.filter((r) => r.id !== id));
    toast.success("Entrada removida.");
  };

  return (
    <AdminLayout>
      <div style={{ padding: "clamp(20px,3vw,32px)", maxWidth: "1100px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "clamp(20px,3vw,28px)" }}>
          <div>
            <p className="overline" style={{ color: "var(--gold)", marginBottom: "5px", fontSize: "9px" }}>Pré-lançamento</p>
            <h1 className="font-display" style={{ fontSize: "clamp(24px,3vw,34px)", fontWeight: 300, color: "var(--text-primary)", lineHeight: 1.1 }}>
              Lista de Espera
            </h1>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={load} className="btn-ghost" style={{ padding: "10px 18px", fontSize: "9px", borderRadius: "12px" }}>
              <RefreshCw size={13} /> Atualizar
            </button>
            <button onClick={exportCSV} disabled={rows.length === 0} className="btn-outline-gold" style={{ padding: "10px 18px", fontSize: "9px", borderRadius: "12px" }}>
              <Download size={13} /> Exportar CSV
            </button>
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "clamp(16px,2.5vw,24px)", flexWrap: "wrap" }}>
          {[
            { icon: Users,    label: "Total",          value: loading ? "…" : rows.length.toLocaleString("pt-BR") },
            { icon: Phone,    label: "Com WhatsApp",   value: loading ? "…" : rows.filter((r) => r.phone).length.toLocaleString("pt-BR") },
            { icon: Calendar, label: "Hoje",           value: loading ? "…" : rows.filter((r) => new Date(r.created_at).toDateString() === new Date().toDateString()).length.toLocaleString("pt-BR") },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="stat-chip" style={{ padding: "12px 18px", gap: "10px", borderRadius: "14px" }}>
              <Icon size={14} style={{ color: "var(--gold)", flexShrink: 0 }} strokeWidth={1.5} />
              <div>
                <p style={{ fontSize: "18px", fontFamily: "Montserrat, sans-serif", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1 }}>{value}</p>
                <p style={{ fontSize: "9px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-faint)", marginTop: "2px" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Search ── */}
        <div style={{ position: "relative", marginBottom: "clamp(14px,2vw,20px)" }}>
          <Search size={14} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none" }} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou telefone…"
            className="input-dark"
            style={{ paddingLeft: "42px", borderRadius: "14px" }}
          />
        </div>

        {/* ── Table ── */}
        <div className="card-dark" style={{ overflow: "hidden", borderRadius: "18px" }}>
          {loading ? (
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <Sk w="32px" h="32px" r="50%" />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <Sk w="160px" h="13px" />
                    <Sk w="220px" h="11px" />
                  </div>
                  <Sk w="100px" h="11px" />
                  <Sk w="120px" h="11px" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "60px 24px", textAlign: "center" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "15px", marginBottom: "8px" }}>
                {search ? "Nenhum resultado encontrado." : "Nenhuma entrada ainda."}
              </p>
              {search && (
                <button onClick={() => setSearch("")} className="btn-ghost" style={{ fontSize: "9px", padding: "9px 18px", borderRadius: "12px", marginTop: "8px" }}>
                  Limpar busca
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    {["Nome", "Email", "WhatsApp", "Fonte", "Data"].map((h) => (
                      <th key={h} style={{
                        padding: "12px 16px", textAlign: "left",
                        fontFamily: "Montserrat, sans-serif", fontSize: "8.5px",
                        letterSpacing: "0.18em", textTransform: "uppercase",
                        color: "var(--text-faint)", fontWeight: 500, whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                    <th style={{ padding: "12px 16px", width: "48px" }} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: i < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.018)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                    >
                      {/* Name */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                            background: "rgba(198,168,112,0.12)", color: "var(--gold)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "12px", fontFamily: "Montserrat", fontWeight: 600,
                          }}>
                            {row.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500, whiteSpace: "nowrap" }}>
                            {row.name}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: "12px 16px" }}>
                        <a href={`mailto:${row.email}`} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--lavender)", textDecoration: "none" }}>
                          <Mail size={12} strokeWidth={1.5} />
                          {row.email}
                        </a>
                      </td>

                      {/* Phone */}
                      <td style={{ padding: "12px 16px" }}>
                        {row.phone ? (
                          <a href={`https://wa.me/55${row.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--sage)", textDecoration: "none" }}>
                            <Phone size={12} strokeWidth={1.5} />
                            {row.phone}
                          </a>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--text-faint)" }}>—</span>
                        )}
                      </td>

                      {/* Source */}
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: "10px", fontFamily: "Montserrat, sans-serif", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-faint)" }}>
                          {row.source ?? "landing"}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "Montserrat, sans-serif" }}>
                          {formatDate(row.created_at)}
                        </span>
                      </td>

                      {/* Delete */}
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          onClick={() => deleteRow(row.id)}
                          disabled={deleting === row.id}
                          aria-label={`Remover ${row.name}`}
                          style={{
                            width: "32px", height: "32px", borderRadius: "8px",
                            background: "transparent", border: "1px solid rgba(201,80,80,0.20)",
                            color: "rgba(201,80,80,0.55)", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(201,80,80,0.08)"; (e.currentTarget as HTMLElement).style.color = "#e07070"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,80,80,0.40)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(201,80,80,0.55)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,80,80,0.20)"; }}
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer note ── */}
        {!loading && rows.length > 0 && (
          <p style={{ fontSize: "11px", color: "var(--text-faint)", fontFamily: "Montserrat, sans-serif", marginTop: "12px", textAlign: "right" }}>
            Exibindo {filtered.length} de {rows.length} entradas
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
