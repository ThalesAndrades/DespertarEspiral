/**
 * AdminMediaPage — Gestão de Projetos e Mídia (Trello)
 * Integração completa com Trello: quadros, listas, cartões.
 */
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw, Plus, ExternalLink, AlertCircle,
  ChevronRight, Clock, CheckSquare, Square,
  Calendar, Layers, X, Loader2,
} from "lucide-react";

/* ─────────── Types ─────────── */
interface TrelloLabel { id: string; name: string; color: string; }
interface TrelloCard {
  id: string; name: string; desc?: string; due?: string | null;
  dueComplete?: boolean; labels?: TrelloLabel[]; url: string;
  dateLastActivity?: string; idList: string;
  badges?: { comments?: number; attachments?: number; checkItems?: number; checkItemsChecked?: number };
}
interface TrelloList {
  id: string; name: string;
  cards?: TrelloCard[];
}
interface TrelloBoard {
  id: string; name: string; desc?: string; url: string;
  dateLastActivity?: string;
  prefs?: { backgroundColor?: string; backgroundImage?: string };
}

const LABEL_COLORS: Record<string, string> = {
  red: "#c9372c", orange: "#f87462", yellow: "#f5cd47", green: "#4bce97",
  blue: "#579dff", purple: "#9f8fef", pink: "#ff8ed7", sky: "#60c6d2",
  lime: "#94c748", black: "#454f59",
};

/* ─────────── Not configured ─────────── */
function NotConfigured({ message }: { message?: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: "14px",
      padding: "56px 24px", borderRadius: "var(--r-xl)",
      border: "1px dashed var(--border-soft)", textAlign: "center",
      background: "var(--bg-surface-2)",
    }}>
      <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(198,168,112,0.08)", border: "1px solid var(--border-mid)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AlertCircle size={22} style={{ color: "var(--gold)" }} strokeWidth={1.5} />
      </div>
      <div>
        <p style={{ fontSize: "16px", color: "var(--text-primary)", fontWeight: 500, marginBottom: "8px" }}>
          Trello não configurado
        </p>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.7, maxWidth: "380px" }}>
          {message ?? "Configure TRELLO_API_KEY e TRELLO_TOKEN nos Secrets do Supabase. Obtenha sua chave em trello.com/app-key."}
        </p>
        <a
          href="https://trello.com/app-key"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline-gold"
          style={{ display: "inline-flex", marginTop: "18px", padding: "10px 20px", fontSize: "9px" }}
        >
          Obter chave Trello <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}

/* ─────────── Card item ─────────── */
function CardItem({ card, onMove, lists }: {
  card: TrelloCard; onMove: (cardId: string, listId: string) => void; lists: TrelloList[];
}) {
  const isOverdue = card.due && !card.dueComplete && new Date(card.due) < new Date();
  const isDueSoon = card.due && !card.dueComplete && !isOverdue &&
    (new Date(card.due).getTime() - Date.now()) < 48 * 60 * 60 * 1000;

  return (
    <div
      className="card-dark"
      style={{ padding: "12px 14px", marginBottom: "8px", cursor: "pointer", transition: "border-color 0.2s" }}
    >
      {/* Labels */}
      {(card.labels ?? []).length > 0 && (
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
          {card.labels!.map(l => (
            <span key={l.id} style={{
              display: "inline-block", width: "36px", height: "5px", borderRadius: "3px",
              background: LABEL_COLORS[l.color] ?? "var(--border-mid)",
              title: l.name,
            }} title={l.name} />
          ))}
        </div>
      )}

      {/* Title */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: card.due || card.badges ? "8px" : "0" }}>
        <p style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.5, flex: 1 }}>{card.name}</p>
        <a
          href={card.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ color: "var(--text-faint)", flexShrink: 0, display: "flex", alignItems: "center" }}
        >
          <ExternalLink size={10} strokeWidth={1.5} />
        </a>
      </div>

      {/* Meta */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        {card.due && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px",
            color: isOverdue ? "var(--rose)" : isDueSoon ? "var(--gold)" : "var(--text-faint)",
          }}>
            {card.dueComplete ? <CheckSquare size={10} style={{ color: "var(--sage)" }} /> : <Calendar size={10} />}
            {new Date(card.due).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </span>
        )}
        {card.badges?.checkItems !== undefined && card.badges.checkItems > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", color: "var(--text-faint)" }}>
            <CheckSquare size={10} strokeWidth={1.5} />
            {card.badges.checkItemsChecked}/{card.badges.checkItems}
          </span>
        )}
        {card.badges?.comments !== undefined && card.badges.comments > 0 && (
          <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>
            💬 {card.badges.comments}
          </span>
        )}
      </div>

      {/* Quick move */}
      {lists.length > 1 && (
        <div style={{ display: "flex", gap: "4px", marginTop: "8px", flexWrap: "wrap" }}>
          {lists.filter(l => l.id !== card.idList).map(l => (
            <button
              key={l.id}
              onClick={() => onMove(card.id, l.id)}
              className="font-label"
              style={{
                fontSize: "7.5px", letterSpacing: "0.12em", padding: "3px 8px",
                borderRadius: "6px", border: "1px solid var(--border-soft)",
                background: "transparent", color: "var(--text-faint)",
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.color = "var(--gold)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-soft)"; e.currentTarget.style.color = "var(--text-faint)"; }}
            >
              → {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────── Add card form ─────────── */
function AddCardForm({ listId, listName, onAdd, onClose }: {
  listId: string; listName: string; onAdd: (listId: string, name: string, desc: string) => Promise<void>; onClose: () => void;
}) {
  const [name, setName]   = useState("");
  const [desc, setDesc]   = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onAdd(listId, name.trim(), desc.trim());
    setSaving(false);
    onClose();
  };

  return (
    <div style={{ padding: "12px", background: "var(--bg-surface-2)", borderRadius: "12px", border: "1px solid var(--border-mid)", marginBottom: "8px" }}>
      <p style={{ fontSize: "11px", color: "var(--gold)", fontFamily: "Montserrat,sans-serif", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "10px" }}>
        Novo cartão em "{listName}"
      </p>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Título do cartão"
        className="input-dark"
        style={{ marginBottom: "8px", minHeight: "40px", fontSize: "14px" }}
        autoFocus
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
      />
      <textarea
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="Descrição (opcional)"
        className="input-dark"
        style={{ marginBottom: "10px", minHeight: "64px", fontSize: "13px" }}
      />
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={onClose} className="btn-ghost" style={{ padding: "8px 14px", fontSize: "9px", flex: 1 }}>
          <X size={11} /> Cancelar
        </button>
        <button onClick={submit} disabled={saving || !name.trim()} className="btn-gold" style={{ padding: "8px 18px", fontSize: "9px", flex: 2, justifyContent: "center" }}>
          {saving ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={12} />}
          Adicionar
        </button>
      </div>
    </div>
  );
}

/* ─────────── Main ─────────── */
export default function AdminMediaPage() {
  const [boards,      setBoards]      = useState<TrelloBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [lists,       setLists]       = useState<TrelloList[]>([]);
  const [cards,       setCards]       = useState<TrelloCard[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [boardLoading, setBoardLoading] = useState(false);
  const [addingTo,    setAddingTo]    = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [notConfigMsg,  setNotConfigMsg]  = useState<string | undefined>();
  const [refreshing,  setRefreshing]  = useState(false);

  const callTrello = useCallback(async (params: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    return supabase.functions.invoke("trello-boards", {
      body: params,
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
  }, []);

  const fetchBoards = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("trello-boards", {
      body: { action: "boards" },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) { try { const t = await error.context?.text(); msg = t || msg; } catch { /* ignore */ } }
      toast.error(msg);
    } else if (data?.error === "not_configured") {
      setNotConfigured(true);
      setNotConfigMsg(data.message);
    } else if (Array.isArray(data)) {
      const open = (data as TrelloBoard[]).filter(b => !(b as Record<string,unknown>).closed);
      setBoards(open);
      if (open.length > 0 && !selectedBoard) setSelectedBoard(open[0].id);
    }
    setLoading(false);
  }, [selectedBoard]);

  const fetchBoard = useCallback(async (boardId: string, showLoader = true) => {
    if (showLoader) setBoardLoading(true);
    else setRefreshing(true);

    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("trello-boards", {
      body: { action: "board", boardId },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });

    if (error) {
      toast.error("Erro ao carregar quadro.");
    } else if (data) {
      setLists(Array.isArray(data.lists) ? data.lists : []);
      setCards(Array.isArray(data.cards) ? data.cards : []);
    }

    if (showLoader) setBoardLoading(false);
    else setRefreshing(false);
  }, []);

  useEffect(() => { fetchBoards(); }, [fetchBoards]);
  useEffect(() => { if (selectedBoard) fetchBoard(selectedBoard); }, [selectedBoard, fetchBoard]);

  const moveCard = useCallback(async (cardId: string, listId: string) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, idList: listId } : c));
    const { error } = await callTrello({ action: "moveCard", cardId, listId });
    if (error) { toast.error("Erro ao mover cartão."); if (selectedBoard) fetchBoard(selectedBoard, false); }
    else toast.success("Cartão movido.");
  }, [callTrello, selectedBoard, fetchBoard]);

  const addCard = useCallback(async (listId: string, name: string, desc: string) => {
    const { data, error } = await callTrello({ action: "createCard", listId, name, desc });
    if (error) { toast.error("Erro ao criar cartão."); return; }
    if (data && !data.error) {
      setCards(prev => [...prev, { ...data as TrelloCard, idList: listId }]);
      toast.success("Cartão criado.");
    }
    setAddingTo(null);
  }, [callTrello]);

  const getListCards = (listId: string) => cards.filter(c => c.idList === listId);
  const currentBoard = boards.find(b => b.id === selectedBoard);

  return (
    <AdminLayout>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <p className="overline" style={{ color: "var(--gold)", marginBottom: "6px", fontSize: "9px" }}>Projetos</p>
            <h1 className="font-display" style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: 300, color: "var(--text-primary)" }}>Gestão de Mídia</h1>
          </div>
          {selectedBoard && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => selectedBoard && fetchBoard(selectedBoard, false)}
                disabled={refreshing}
                className="btn-ghost"
                style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 14px" }}
              >
                <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.14em" }}>Atualizar</span>
              </button>
              {currentBoard?.url && (
                <a href={currentBoard.url} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px" }}>
                  <ExternalLink size={13} />
                  <span className="font-label" style={{ fontSize: "9px", letterSpacing: "0.14em" }}>Abrir Trello</span>
                </a>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Skeleton className="h-10 w-56 rounded-xl" />
            <div style={{ display: "flex", gap: "16px" }}>
              {[0,1,2].map(i => <Skeleton key={i} className="h-80 flex-1 rounded-2xl" />)}
            </div>
          </div>
        ) : notConfigured ? (
          <NotConfigured message={notConfigMsg} />
        ) : (
          <>
            {/* Board selector */}
            {boards.length > 1 && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
                {boards.map(b => {
                  const active = selectedBoard === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBoard(b.id)}
                      className="font-label"
                      style={{
                        padding: "7px 18px", borderRadius: "100px", fontSize: "9px",
                        letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer",
                        border: `1px solid ${active ? "var(--gold)" : "var(--border-soft)"}`,
                        background: active ? "rgba(198,168,112,0.08)" : "transparent",
                        color: active ? "var(--gold)" : "var(--text-muted)",
                        transition: "all 0.2s", display: "flex", alignItems: "center", gap: "6px",
                      }}
                    >
                      <Layers size={11} /> {b.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Summary strip */}
            {!boardLoading && lists.length > 0 && (
              <div style={{
                display: "flex", gap: "0", marginBottom: "20px", overflow: "hidden",
                borderRadius: "var(--r-xl)", border: "1px solid var(--border-subtle)",
              }}>
                {lists.map((list, i) => {
                  const count = getListCards(list.id).length;
                  return (
                    <div
                      key={list.id}
                      style={{
                        flex: "1 1 0", padding: "14px 16px", textAlign: "center",
                        borderRight: i < lists.length - 1 ? "1px solid var(--border-subtle)" : "none",
                        background: "var(--bg-surface-2)",
                      }}
                    >
                      <p className="font-display" style={{ fontSize: "22px", color: "var(--gold)", fontWeight: 300, lineHeight: 1 }}>{count}</p>
                      <p style={{ fontSize: "9px", color: "var(--text-faint)", fontFamily: "Montserrat,sans-serif", letterSpacing: "0.14em", textTransform: "uppercase", marginTop: "5px" }}>
                        {list.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Kanban */}
            {boardLoading ? (
              <div style={{ display: "flex", gap: "14px" }}>
                {[0,1,2].map(i => <Skeleton key={i} className="h-80 flex-1 rounded-2xl" />)}
              </div>
            ) : lists.length === 0 ? (
              <div className="card-dark" style={{ padding: "40px", textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: "var(--text-faint)" }}>Nenhuma lista encontrada neste quadro.</p>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "14px", overflowX: "auto", paddingBottom: "16px" }} className="scrollbar-thin scroll-x-hidden">
                {lists.map(list => {
                  const listCards = getListCards(list.id);
                  return (
                    <div
                      key={list.id}
                      style={{
                        minWidth: "260px", maxWidth: "280px", flex: "0 0 260px",
                        background: "var(--bg-surface-2)", borderRadius: "var(--r-xl)",
                        border: "1px solid var(--border-subtle)", padding: "14px",
                      }}
                    >
                      {/* List header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--gold)", display: "block", flexShrink: 0 }} />
                          <p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{list.name}</p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "11px", color: "var(--text-faint)" }}>{listCards.length}</span>
                          <button
                            onClick={() => setAddingTo(addingTo === list.id ? null : list.id)}
                            style={{ width: "24px", height: "24px", borderRadius: "7px", background: "transparent", border: "1px solid var(--border-soft)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", transition: "all 0.15s" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.color = "var(--gold)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-soft)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Add card form */}
                      {addingTo === list.id && (
                        <AddCardForm
                          listId={list.id}
                          listName={list.name}
                          onAdd={addCard}
                          onClose={() => setAddingTo(null)}
                        />
                      )}

                      {/* Cards */}
                      <div style={{ maxHeight: "560px", overflowY: "auto" }} className="scrollbar-thin">
                        {listCards.length === 0 ? (
                          <div style={{ padding: "20px 0", textAlign: "center" }}>
                            <Square size={18} style={{ color: "var(--border-mid)", margin: "0 auto 8px" }} strokeWidth={1} />
                            <p style={{ fontSize: "11px", color: "var(--text-faint)" }}>Sem cartões</p>
                          </div>
                        ) : listCards.map(card => (
                          <CardItem
                            key={card.id}
                            card={card}
                            lists={lists}
                            onMove={moveCard}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Due soon alerts */}
            {(() => {
              const overdue = cards.filter(c => c.due && !c.dueComplete && new Date(c.due) < new Date());
              if (overdue.length === 0) return null;
              return (
                <div style={{ marginTop: "20px", padding: "12px 16px", borderRadius: "12px", background: "rgba(201,154,170,0.07)", border: "1px solid rgba(201,154,170,0.22)", display: "flex", alignItems: "center", gap: "10px" }}>
                  <Clock size={13} style={{ color: "var(--rose)", flexShrink: 0 }} strokeWidth={1.5} />
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    <strong style={{ color: "var(--rose)" }}>{overdue.length}</strong> cartão(ns) com prazo vencido:{" "}
                    {overdue.slice(0, 3).map(c => c.name).join(", ")}{overdue.length > 3 ? ` e mais ${overdue.length - 3}` : ""}.
                  </p>
                </div>
              );
            })()}
          </>
        )}

        {/* Due: show list navigation arrow when boards selector visible */}
        {!loading && !notConfigured && boards.length === 0 && (
          <div className="card-dark" style={{ padding: "40px", textAlign: "center" }}>
            <Layers size={28} style={{ color: "var(--border-mid)", margin: "0 auto 12px" }} strokeWidth={1} />
            <p style={{ fontSize: "14px", color: "var(--text-faint)" }}>Nenhum quadro Trello ativo encontrado.</p>
            <p style={{ fontSize: "12px", color: "var(--text-faint)", marginTop: "8px" }}>
              Crie um quadro no Trello e conecte a conta para visualizar aqui.
              {" "}<ChevronRight size={11} style={{ display: "inline", verticalAlign: "middle" }} />
            </p>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </AdminLayout>
  );
}
