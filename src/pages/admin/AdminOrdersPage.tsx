import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { TrendingUp, CheckCircle, Loader2, RefreshCw } from "lucide-react";

interface Order {
  id: string;
  email: string;
  name: string | null;
  product_id: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "refunded";
  payment_method: string | null;
  created_at: string;
  paid_at: string | null;
  sequenzy_session_id: string | null;
  products: { title: string; slug: string } | null;
}

type StatusFilter = "all" | Order["status"];

const statusLabel: Record<Order["status"], string> = {
  paid: "PAGO", pending: "PENDENTE", failed: "FALHOU", refunded: "REEMBOLSO",
};
const statusClass: Record<Order["status"], string> = {
  paid: "badge-sage", pending: "badge-lavender", failed: "badge-rose", refunded: "badge-rose",
};

const filters: { value: StatusFilter; label: string }[] = [
  { value: "all",     label: "Todos" },
  { value: "paid",    label: "Pagos" },
  { value: "pending", label: "Pendentes" },
  { value: "failed",  label: "Falhos" },
];

export default function AdminOrdersPage() {
  const [filter, setFilter]         = useState<StatusFilter>("all");
  const [orders, setOrders]         = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, products(title, slug)")
      .order("created_at", { ascending: false });

    if (error) { toast.error("Erro ao carregar pedidos."); }
    else setOrders(data ?? []);
    setLoadingOrders(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const confirmPayment = async (orderId: string) => {
    setConfirming(orderId);
    const { data, error } = await supabase.functions.invoke("sequenzy-webhook", {
      body: { action: "confirm_payment", orderId, paymentMethod: "pix" },
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try {
          const text = await error.context?.text();
          msg = text || msg;
        } catch { /* ignore */ }
      }
      toast.error(msg);
    } else {
      toast.success("Pagamento confirmado e acesso liberado. ✦");
      // Optimistically update local state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: "paid", payment_method: "pix", paid_at: new Date().toISOString() }
            : o
        )
      );
    }
    setConfirming(null);
  };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const totalRevenue = orders.filter((o) => o.status === "paid").reduce((s, o) => s + o.amount, 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <AdminLayout>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <p className="overline" style={{ color: "var(--gold)", marginBottom: "6px", fontSize: "9px" }}>Financeiro</p>
            <h1 className="font-display" style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 300, color: "var(--text-primary)" }}>Pedidos</h1>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {pendingCount > 0 && (
              <div className="card-dark" style={{ padding: "14px 20px", textAlign: "right" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end", marginBottom: "4px" }}>
                  <span className="font-label" style={{ fontSize: "8px", letterSpacing: "0.2em", color: "var(--text-faint)", textTransform: "uppercase" }}>Pendentes</span>
                </div>
                <p className="font-display" style={{ fontSize: "22px", fontWeight: 300, color: "var(--rose)" }}>
                  {pendingCount}
                </p>
              </div>
            )}
            <div className="card-dark" style={{ padding: "14px 20px", textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end", marginBottom: "4px" }}>
                <TrendingUp size={11} style={{ color: "var(--sage)" }} strokeWidth={1.5} />
                <span className="font-label" style={{ fontSize: "8px", letterSpacing: "0.2em", color: "var(--text-faint)", textTransform: "uppercase" }}>Receita total</span>
              </div>
              <p className="font-display" style={{ fontSize: "22px", fontWeight: 300, color: "var(--gold)" }}>
                R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <button
              onClick={fetchOrders}
              className="btn-ghost"
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px" }}
            >
              <RefreshCw size={13} style={{ animation: loadingOrders ? "spin 1s linear infinite" : "none" }} />
              <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.15em" }}>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
          {filters.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className="font-label"
                style={{
                  padding: "5px 16px", borderRadius: "100px", border: "1px solid", fontSize: "9px",
                  letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer",
                  transition: "all 0.2s",
                  borderColor: active ? "var(--gold)" : "rgba(198,168,112,0.15)",
                  color:       active ? "var(--gold)" : "var(--text-faint)",
                  background:  active ? "rgba(198,168,112,0.08)" : "transparent",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="card-dark hidden md:block" style={{ overflow: "hidden" }}>
          {loadingOrders ? (
            <div style={{ padding: "48px", textAlign: "center" }}>
              <Loader2 size={22} style={{ color: "var(--gold)", animation: "spin 1s linear infinite", margin: "0 auto" }} />
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(198,168,112,0.07)" }}>
                    {["Data", "Compradora", "Produto", "Valor", "Status", "Ação"].map((h) => (
                      <th key={h} className="font-label" style={{ textAlign: "left", padding: "10px 16px", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-faint)", fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o, i) => (
                    <tr key={o.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(198,168,112,0.05)" : "none" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <span className="font-label" style={{ fontSize: "9px", color: "var(--text-faint)", letterSpacing: "0.08em" }}>
                          {new Date(o.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: "13px", color: "var(--text-primary)", marginBottom: "2px" }}>{o.name || "—"}</p>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{o.email}</p>
                      </td>
                      <td style={{ padding: "14px 16px" }}><span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{o.products?.title ?? "—"}</span></td>
                      <td style={{ padding: "14px 16px" }}>
                        <span className="font-display" style={{ fontSize: "18px", color: "var(--gold)", fontWeight: 300 }}>R$ {o.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td style={{ padding: "14px 16px" }}><span className={statusClass[o.status]} style={{ fontSize: "8px", padding: "3px 10px" }}>{statusLabel[o.status]}</span></td>
                      <td style={{ padding: "14px 16px" }}>
                        {o.status === "pending" && (
                          <button onClick={() => confirmPayment(o.id)} disabled={confirming === o.id} className="btn-ghost"
                            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", fontSize: "9px", borderColor: "rgba(140,170,150,0.3)", color: "var(--sage)" }}>
                            {confirming === o.id ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle size={11} strokeWidth={2} />}
                            Confirmar
                          </button>
                        )}
                        {o.status === "paid" && o.paid_at && (
                          <span className="font-label" style={{ fontSize: "9px", color: "var(--sage)", letterSpacing: "0.1em" }}>{new Date(o.paid_at).toLocaleDateString("pt-BR")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: "48px", textAlign: "center", fontSize: "13px", color: "var(--text-faint)" }}>Nenhum pedido encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mobile card list */}
        <div className="md:hidden" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {loadingOrders ? (
            <div style={{ padding: "48px", textAlign: "center" }}>
              <Loader2 size={22} style={{ color: "var(--gold)", animation: "spin 1s linear infinite", margin: "0 auto" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="card-dark" style={{ padding: "40px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "var(--text-faint)" }}>Nenhum pedido encontrado.</p>
            </div>
          ) : filtered.map((o) => (
            <div key={o.id} className="card-dark" style={{ padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.name || o.email}</p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.email}</p>
                </div>
                <span className={statusClass[o.status]} style={{ fontSize: "8px", padding: "3px 10px", flexShrink: 0 }}>{statusLabel[o.status]}</span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>{o.products?.title ?? "—"}</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p className="font-display" style={{ fontSize: "20px", color: "var(--gold)", fontWeight: 300 }}>R$ {o.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                {o.status === "pending" ? (
                  <button onClick={() => confirmPayment(o.id)} disabled={confirming === o.id} className="btn-ghost"
                    style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 14px", fontSize: "9px", borderColor: "rgba(140,170,150,0.3)", color: "var(--sage)" }}>
                    {confirming === o.id ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle size={11} strokeWidth={2} />}
                    Confirmar PIX
                  </button>
                ) : (
                  <span className="font-label" style={{ fontSize: "9px", color: "var(--text-faint)", letterSpacing: "0.1em" }}>{new Date(o.created_at).toLocaleDateString("pt-BR")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  );
}
