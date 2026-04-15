import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { TrendingUp, CheckCircle, Loader2, RefreshCw, X, CreditCard, Zap, FileText } from "lucide-react";

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
type PayMethod = "pix" | "credit" | "boleto" | "manual";

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

const METHOD_OPTIONS: { value: PayMethod; label: string; icon: React.ElementType }[] = [
  { value: "pix",    label: "PIX",    icon: Zap },
  { value: "credit", label: "Cartão", icon: CreditCard },
  { value: "boleto", label: "Boleto", icon: FileText },
  { value: "manual", label: "Manual", icon: CheckCircle },
];

export default function AdminOrdersPage() {
  const [filter,         setFilter]         = useState<StatusFilter>("all");
  const [orders,         setOrders]         = useState<Order[]>([]);
  const [loadingOrders,  setLoadingOrders]  = useState(true);
  const [confirming,     setConfirming]     = useState<string | null>(null);
  const [confirmModal,   setConfirmModal]   = useState<{ orderId: string; email: string; name: string | null } | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PayMethod>("pix");

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

  const openConfirmModal = (o: Order) => {
    setConfirmModal({ orderId: o.id, email: o.email, name: o.name });
    // Pre-select the method the buyer used, fallback to pix
    const m = (["pix", "credit", "boleto"] as PayMethod[]).includes(o.payment_method as PayMethod)
      ? (o.payment_method as PayMethod)
      : "pix";
    setSelectedMethod(m);
  };

  const confirmPayment = async (orderId: string, method: PayMethod) => {
    setConfirming(orderId);
    setConfirmModal(null);

    // Pass admin JWT so the edge function can verify admin role
    const { data: { session } } = await supabase.auth.getSession();

    const { data, error } = await supabase.functions.invoke("sequenzy-webhook", {
      body: { action: "confirm_payment", orderId, paymentMethod: method },
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined,
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try {
          const statusCode = error.context?.status ?? 500;
          const text = await error.context?.text();
          msg = `[${statusCode}] ${text || msg}`;
        } catch { /* ignore */ }
      }
      toast.error(msg);
    } else if (data?.success) {
      toast.success("Pagamento confirmado e acesso liberado. ✦");
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: "paid", payment_method: method, paid_at: new Date().toISOString() }
            : o
        )
      );
    } else {
      toast.error(data?.error ?? "Erro ao confirmar pagamento.");
    }
    setConfirming(null);
  };

  const filtered      = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const totalRevenue  = orders.filter((o) => o.status === "paid").reduce((s, o) => s + o.amount, 0);
  const pendingCount  = orders.filter((o) => o.status === "pending").length;

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
                    {["Data", "Compradora", "Produto", "Valor", "Método", "Status", "Ação"].map((h) => (
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
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{o.products?.title ?? "—"}</span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span className="font-display" style={{ fontSize: "18px", color: "var(--gold)", fontWeight: 300 }}>
                          R$ {o.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span className="font-label" style={{ fontSize: "9px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                          {o.payment_method ?? "—"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span className={statusClass[o.status]} style={{ fontSize: "8px", padding: "3px 10px" }}>{statusLabel[o.status]}</span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {o.status === "pending" && (
                          <button
                            onClick={() => openConfirmModal(o)}
                            disabled={confirming === o.id}
                            className="btn-ghost"
                            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", fontSize: "9px", borderColor: "rgba(140,170,150,0.3)", color: "var(--sage)" }}>
                            {confirming === o.id
                              ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                              : <CheckCircle size={11} strokeWidth={2} />}
                            Confirmar
                          </button>
                        )}
                        {o.status === "paid" && o.paid_at && (
                          <span className="font-label" style={{ fontSize: "9px", color: "var(--sage)", letterSpacing: "0.1em" }}>
                            {new Date(o.paid_at).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: "48px", textAlign: "center", fontSize: "13px", color: "var(--text-faint)" }}>
                        Nenhum pedido encontrado.
                      </td>
                    </tr>
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
                  <p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {o.name || o.email}
                  </p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {o.email}
                  </p>
                </div>
                <span className={statusClass[o.status]} style={{ fontSize: "8px", padding: "3px 10px", flexShrink: 0 }}>
                  {statusLabel[o.status]}
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", flex: 1 }}>
                  {o.products?.title ?? "—"}
                </p>
                {o.payment_method && (
                  <span className="font-label" style={{ fontSize: "8px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {o.payment_method}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p className="font-display" style={{ fontSize: "20px", color: "var(--gold)", fontWeight: 300 }}>
                  R$ {o.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                {o.status === "pending" ? (
                  <button
                    onClick={() => openConfirmModal(o)}
                    disabled={confirming === o.id}
                    className="btn-ghost"
                    style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 14px", fontSize: "9px", borderColor: "rgba(140,170,150,0.3)", color: "var(--sage)" }}>
                    {confirming === o.id
                      ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                      : <CheckCircle size={11} strokeWidth={2} />}
                    Confirmar
                  </button>
                ) : (
                  <span className="font-label" style={{ fontSize: "9px", color: "var(--text-faint)", letterSpacing: "0.1em" }}>
                    {new Date(o.created_at).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Confirm Payment Modal ── */}
      {confirmModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 400,
            background: "rgba(4,6,15,0.72)",
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="sheet-enter"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: "420px",
              background: "var(--sidebar-bg)",
              border: "1px solid var(--border-soft)",
              borderRadius: "24px",
              padding: "clamp(20px,4vw,32px)",
            }}
          >
            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <p className="overline" style={{ color: "var(--gold)", fontSize: "8px", marginBottom: "4px" }}>Confirmar pagamento</p>
                <h3 className="font-display" style={{ fontSize: "24px", fontWeight: 300, color: "var(--text-primary)" }}>
                  Liberar acesso
                </h3>
              </div>
              <button
                onClick={() => setConfirmModal(null)}
                style={{
                  width: "34px", height: "34px", borderRadius: "50%",
                  background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--text-muted)", transition: "background 0.2s",
                }}>
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>

            {/* Buyer info */}
            <div style={{ padding: "12px 14px", background: "var(--bg-surface-2)", borderRadius: "12px", border: "1px solid var(--border-subtle)", marginBottom: "20px" }}>
              <p style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500, marginBottom: "3px" }}>
                {confirmModal.name || "—"}
              </p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{confirmModal.email}</p>
            </div>

            {/* Method selector */}
            <p className="font-label" style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>
              Método de pagamento recebido
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px", marginBottom: "22px" }}>
              {METHOD_OPTIONS.map(({ value, label, icon: Icon }) => {
                const active = selectedMethod === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedMethod(value)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
                      padding: "12px 6px", borderRadius: "12px",
                      border: `1.5px solid ${active ? "var(--gold)" : "var(--border-soft)"}`,
                      background: active ? "rgba(198,168,112,0.08)" : "transparent",
                      cursor: "pointer", transition: "all 0.18s",
                    }}>
                    <Icon size={14} style={{ color: active ? "var(--gold)" : "var(--text-faint)" }} strokeWidth={1.5} />
                    <span className="font-label" style={{ fontSize: "7.5px", letterSpacing: "0.10em", textTransform: "uppercase", color: active ? "var(--gold)" : "var(--text-faint)" }}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Warning */}
            <div style={{ padding: "10px 12px", background: "rgba(198,168,112,0.06)", border: "1px solid rgba(198,168,112,0.15)", borderRadius: "10px", marginBottom: "18px" }}>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.65 }}>
                Esta ação marca o pedido como <strong style={{ color: "var(--gold)" }}>PAGO</strong>, libera acesso ao produto e dispara o e-mail de boas-vindas via Sequenzy. Não pode ser desfeita.
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setConfirmModal(null)}
                className="btn-ghost"
                style={{ flex: 1, justifyContent: "center", minHeight: "48px", fontSize: "9px" }}>
                Cancelar
              </button>
              <button
                onClick={() => confirmPayment(confirmModal.orderId, selectedMethod)}
                disabled={!!confirming}
                className="btn-gold"
                style={{ flex: 2, justifyContent: "center", minHeight: "48px", fontSize: "9px" }}>
                {confirming
                  ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Confirmando…</>
                  : <><CheckCircle size={13} strokeWidth={2} /> Confirmar e liberar acesso</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  );
}
