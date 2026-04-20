/**
 * AdminUsersPage — Gestão de usuários com dados reais do Supabase
 * Mobile-first: cards empilhados em mobile, tabela em desktop
 */
import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Search, Shield, BookOpen, Users, Loader2, RefreshCw } from "lucide-react";

interface UserRow {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  anonymous_name: string | null;
  role: string;
  created_at?: string;
  product_count?: number;
}

export default function AdminUsersPage() {
  const [users, setUsers]   = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .order("role", { ascending: false });

    if (error) { toast.error("Erro ao carregar usuários."); }
    else {
      // Count products per user
      const userIds = (data ?? []).map((u) => u.id);
      const { data: upData } = await supabase
        .from("user_products")
        .select("user_id")
        .in("user_id", userIds);

      const counts: Record<string, number> = {};
      (upData ?? []).forEach(({ user_id }: { user_id: string }) => {
        counts[user_id] = (counts[user_id] ?? 0) + 1;
      });

      setUsers((data ?? []).map((u) => ({ ...u, product_count: counts[u.id] ?? 0 })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "member" : "admin";
    const prompt = newRole === "admin"
      ? "Promover esta usuária a administradora? Ela terá acesso total ao painel."
      : "Remover permissões de administradora desta conta?";
    if (!confirm(prompt)) return;
    setUpdating(userId);
    const { error } = await supabase
      .from("user_profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) { toast.error("Erro ao atualizar papel."); }
    else {
      toast.success(`Papel atualizado para ${newRole}.`);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    }
    setUpdating(null);
  };

  const filtered = users.filter((u) =>
    (u.full_name ?? u.username ?? u.email).toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const displayName = (u: UserRow) => u.full_name ?? u.username ?? u.email.split("@")[0];

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "clamp(20px,3vw,32px)", flexWrap: "wrap" }}>
        <div>
          <p className="overline" style={{ color: "var(--gold)", marginBottom: "6px" }}>Gestão</p>
          <h1 className="font-display" style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 300, color: "var(--text-primary)" }}>Usuários</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            {users.length} {users.length === 1 ? "usuária" : "usuárias"} registradas
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar usuária..."
              className="input-dark"
              style={{ paddingLeft: "34px", width: "clamp(160px,30vw,220px)", fontSize: "13px", minHeight: "40px" }}
            />
          </div>
          <button onClick={fetchUsers} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", minHeight: "40px" }}>
            <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.14em" }}>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "clamp(16px,2vw,24px)" }}>
        {[
          { label: "Total", value: users.length, icon: Users, color: "var(--lavender)" },
          { label: "Membros", value: users.filter((u) => u.role === "member").length, icon: BookOpen, color: "var(--sage)" },
          { label: "Admins",  value: users.filter((u) => u.role === "admin").length,  icon: Shield,  color: "var(--gold)" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card-dark" style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: "10px", flex: "1 1 100px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={13} style={{ color }} strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-display" style={{ fontSize: "20px", color: "var(--text-primary)", fontWeight: 300, lineHeight: 1 }}>{value}</p>
              <p className="font-label" style={{ fontSize: "8px", color: "var(--text-faint)", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: "3px" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center" }}>
          <Loader2 size={24} style={{ color: "var(--gold)", animation: "spin 1s linear infinite", margin: "0 auto" }} />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card-dark hidden md:block" style={{ overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    {["Usuária", "Nome anônimo", "Cursos", "Papel", "Ações"].map((h) => (
                      <th key={h} className="font-label" style={{ textAlign: "left", padding: "12px 18px", fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-faint)", fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "rgba(198,168,112,0.12)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontFamily: "Montserrat", fontWeight: 500, flexShrink: 0 }}>
                            {displayName(u).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{displayName(u)}</p>
                            <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span className="font-label" style={{ fontSize: "10px", color: "var(--lavender)", letterSpacing: "0.1em" }}>{u.anonymous_name ?? "—"}</span>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <BookOpen size={11} style={{ color: "var(--text-faint)" }} strokeWidth={1.5} />
                          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{u.product_count ?? 0}</span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        {u.role === "admin" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <Shield size={11} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                            <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.1em", color: "var(--gold)" }}>Admin</span>
                          </div>
                        ) : (
                          <span className="badge-lavender" style={{ fontSize: "8px" }}>MEMBRO</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        {u.email !== "sunyan@despertarespiral.com" && (
                          <button
                            onClick={() => toggleRole(u.id, u.role)}
                            disabled={updating === u.id}
                            className="btn-ghost"
                            style={{ padding: "5px 12px", fontSize: "9px", display: "flex", alignItems: "center", gap: "5px", minHeight: "32px" }}
                          >
                            {updating === u.id && <Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} />}
                            {u.role === "admin" ? "→ Membro" : "→ Admin"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: "48px", textAlign: "center", fontSize: "13px", color: "var(--text-faint)" }}>Nenhuma usuária encontrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.length === 0 ? (
              <div className="card-dark" style={{ padding: "40px", textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: "var(--text-faint)" }}>Nenhuma usuária encontrada.</p>
              </div>
            ) : filtered.map((u) => (
              <div key={u.id} className="card-dark" style={{ padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(198,168,112,0.12)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontFamily: "Montserrat", fontWeight: 500, flexShrink: 0 }}>
                    {displayName(u).charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName(u)}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
                  </div>
                  {u.role === "admin"
                    ? <span className="badge-gold" style={{ fontSize: "8px", flexShrink: 0 }}>ADMIN</span>
                    : <span className="badge-lavender" style={{ fontSize: "8px", flexShrink: 0 }}>MEMBRO</span>
                  }
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", gap: "14px" }}>
                    {u.anonymous_name && (
                      <span className="font-label" style={{ fontSize: "9px", color: "var(--lavender)", letterSpacing: "0.1em" }}>{u.anonymous_name}</span>
                    )}
                    <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text-faint)" }}>
                      <BookOpen size={10} strokeWidth={1.5} /> {u.product_count ?? 0} curso(s)
                    </span>
                  </div>
                  {u.email !== "sunyan@despertarespiral.com" && (
                    <button
                      onClick={() => toggleRole(u.id, u.role)}
                      disabled={updating === u.id}
                      className="btn-ghost"
                      style={{ padding: "6px 12px", fontSize: "9px", display: "flex", alignItems: "center", gap: "5px", minHeight: "34px" }}
                    >
                      {updating === u.id && <Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} />}
                      {u.role === "admin" ? "→ Membro" : "→ Admin"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </AdminLayout>
  );
}
