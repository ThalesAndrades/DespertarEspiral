/**
 * QuizEditor — Admin inline quiz builder for a module
 *
 * Features:
 *  - Create / load existing quiz for a module
 *  - Customise title, description, passing score, active toggle
 *  - Add / edit / delete questions (multiple_choice | true_false)
 *  - Add / delete options per question + mark correct answer
 *  - Persists every change immediately via Supabase
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { ModuleQuiz, QuizQuestion, QuizOption } from "@/types";
import {
  Plus, Trash2, Check, X, Loader2, ChevronDown, ChevronRight,
  GripVertical, ToggleLeft, ToggleRight, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

/* ── helpers ── */
const LABEL: React.CSSProperties = {
  display: "block",
  fontFamily: "Montserrat, sans-serif",
  fontSize: "9px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: "6px",
  fontWeight: 500,
};

type QType = QuizQuestion["type"];

interface Props {
  moduleId: string;
  productId: string;
}

/* ─────────────────────────────────────────────────────────────── */
export default function QuizEditor({ moduleId, productId }: Props) {
  const [quiz,          setQuiz]          = useState<ModuleQuiz | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [openQ,         setOpenQ]         = useState<string | null>(null); // expanded question id
  const [creating,      setCreating]      = useState(false);

  // New-question draft state
  const [showAddQ,      setShowAddQ]      = useState(false);
  const [newQText,      setNewQText]      = useState("");
  const [newQType,      setNewQType]      = useState<QType>("multiple_choice");
  const [addingQ,       setAddingQ]       = useState(false);

  // New-option draft state (per question)
  const [newOptionText, setNewOptionText] = useState<Record<string, string>>({});

  /* ── Load quiz for module ── */
  const loadQuiz = useCallback(async () => {
    setLoading(true);
    const { data: quizRow } = await supabase
      .from("module_quizzes")
      .select("id, module_id, title, description, passing_score, is_active")
      .eq("module_id", moduleId)
      .maybeSingle();

    if (!quizRow) { setQuiz(null); setLoading(false); return; }

    const { data: questions } = await supabase
      .from("quiz_questions")
      .select("id, quiz_id, question, type, sort_order")
      .eq("quiz_id", quizRow.id)
      .order("sort_order");

    const qIds = (questions ?? []).map((q: { id: string }) => q.id);
    let optionsMap: Record<string, QuizOption[]> = {};

    if (qIds.length > 0) {
      const { data: options } = await supabase
        .from("quiz_options")
        .select("id, question_id, text, is_correct, sort_order")
        .in("question_id", qIds)
        .order("sort_order");

      for (const opt of (options ?? []) as QuizOption[]) {
        if (!optionsMap[opt.question_id]) optionsMap[opt.question_id] = [];
        optionsMap[opt.question_id].push(opt);
      }
    }

    const fullQuiz: ModuleQuiz = {
      ...(quizRow as Omit<ModuleQuiz, "questions">),
      questions: (questions ?? []).map((q: QuizQuestion) => ({
        ...q,
        options: optionsMap[q.id] ?? [],
      })),
    };

    setQuiz(fullQuiz);
    setLoading(false);
  }, [moduleId]);

  useEffect(() => { loadQuiz(); }, [loadQuiz]);

  /* ── Create quiz ── */
  const createQuiz = async () => {
    setCreating(true);
    const { data, error } = await supabase
      .from("module_quizzes")
      .insert({ module_id: moduleId, title: "Quiz do módulo", passing_score: 70, is_active: true })
      .select("id, module_id, title, description, passing_score, is_active")
      .single();
    if (error) { toast.error("Erro ao criar quiz."); setCreating(false); return; }
    setQuiz({ ...(data as Omit<ModuleQuiz, "questions">), questions: [] });
    setCreating(false);
    toast.success("Quiz criado. ✦");
  };

  /* ── Save quiz settings ── */
  const saveSettings = async () => {
    if (!quiz) return;
    setSaving(true);
    const { error } = await supabase
      .from("module_quizzes")
      .update({
        title:         quiz.title,
        description:   quiz.description,
        passing_score: quiz.passing_score,
        is_active:     quiz.is_active,
      })
      .eq("id", quiz.id);
    if (error) toast.error("Erro ao salvar configurações.");
    else toast.success("Configurações salvas. ✦");
    setSaving(false);
  };

  /* ── Delete quiz entirely ── */
  const deleteQuiz = async () => {
    if (!quiz) return;
    if (!confirm("Remover o quiz e todas as perguntas? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("module_quizzes").delete().eq("id", quiz.id);
    if (error) toast.error("Erro ao remover quiz.");
    else { setQuiz(null); toast.success("Quiz removido."); }
  };

  /* ── Add question ── */
  const addQuestion = async () => {
    if (!quiz || !newQText.trim()) { toast.error("Digite o enunciado da pergunta."); return; }
    setAddingQ(true);

    const { data, error } = await supabase
      .from("quiz_questions")
      .insert({
        quiz_id:    quiz.id,
        question:   newQText.trim(),
        type:       newQType,
        sort_order: quiz.questions.length + 1,
      })
      .select("id, quiz_id, question, type, sort_order")
      .single();

    if (error) { toast.error("Erro ao criar pergunta."); setAddingQ(false); return; }

    const newQ: QuizQuestion = { ...(data as QuizQuestion), options: [] };

    // For true_false: auto-create the two options
    if (newQType === "true_false") {
      const opts = [
        { question_id: newQ.id, text: "Verdadeiro", is_correct: true,  sort_order: 1 },
        { question_id: newQ.id, text: "Falso",      is_correct: false, sort_order: 2 },
      ];
      const { data: optData } = await supabase.from("quiz_options").insert(opts).select();
      newQ.options = (optData ?? []) as QuizOption[];
    }

    setQuiz((prev) => prev ? { ...prev, questions: [...prev.questions, newQ] } : prev);
    setNewQText("");
    setNewQType("multiple_choice");
    setShowAddQ(false);
    setOpenQ(newQ.id);
    toast.success("Pergunta adicionada. ✦");
    setAddingQ(false);
  };

  /* ── Delete question ── */
  const deleteQuestion = async (qId: string) => {
    if (!quiz) return;
    if (!confirm("Remover esta pergunta?")) return;
    const { error } = await supabase.from("quiz_questions").delete().eq("id", qId);
    if (error) { toast.error("Erro ao remover pergunta."); return; }
    setQuiz((prev) => prev ? { ...prev, questions: prev.questions.filter((q) => q.id !== qId) } : prev);
    toast.success("Pergunta removida.");
  };

  /* ── Update question text ── */
  const updateQuestionText = (qId: string, text: string) => {
    setQuiz((prev) => prev ? {
      ...prev,
      questions: prev.questions.map((q) => q.id === qId ? { ...q, question: text } : q),
    } : prev);
  };

  const saveQuestionText = async (q: QuizQuestion) => {
    const { error } = await supabase.from("quiz_questions").update({ question: q.question.trim() }).eq("id", q.id);
    if (error) toast.error("Erro ao salvar pergunta.");
    else toast.success("Pergunta salva.");
  };

  /* ── Add option ── */
  const addOption = async (qId: string) => {
    const text = (newOptionText[qId] ?? "").trim();
    if (!text) { toast.error("Digite o texto da opção."); return; }
    if (!quiz) return;

    const q = quiz.questions.find((q) => q.id === qId);
    const { data, error } = await supabase
      .from("quiz_options")
      .insert({ question_id: qId, text, is_correct: false, sort_order: (q?.options.length ?? 0) + 1 })
      .select("id, question_id, text, is_correct, sort_order")
      .single();

    if (error) { toast.error("Erro ao adicionar opção."); return; }

    setQuiz((prev) => prev ? {
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === qId ? { ...q, options: [...q.options, data as QuizOption] } : q
      ),
    } : prev);
    setNewOptionText((p) => ({ ...p, [qId]: "" }));
  };

  /* ── Delete option ── */
  const deleteOption = async (qId: string, optId: string) => {
    const { error } = await supabase.from("quiz_options").delete().eq("id", optId);
    if (error) { toast.error("Erro ao remover opção."); return; }
    setQuiz((prev) => prev ? {
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === qId ? { ...q, options: q.options.filter((o) => o.id !== optId) } : q
      ),
    } : prev);
  };

  /* ── Toggle correct answer ── */
  const setCorrect = async (qId: string, optId: string) => {
    if (!quiz) return;
    const q = quiz.questions.find((q) => q.id === qId);
    if (!q) return;

    // For multiple_choice: only one correct at a time
    // For true_false: toggle between the two
    const updates = q.options.map((o) => ({
      id: o.id,
      is_correct: o.id === optId,
    }));

    // Persist all in parallel
    await Promise.all(
      updates.map((u) =>
        supabase.from("quiz_options").update({ is_correct: u.is_correct }).eq("id", u.id)
      )
    );

    setQuiz((prev) => prev ? {
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === qId
          ? { ...q, options: q.options.map((o) => ({ ...o, is_correct: o.id === optId })) }
          : q
      ),
    } : prev);
  };

  /* ─────────────────────────── RENDER ─────────────────────────── */

  if (loading) return (
    <div style={{ padding: "20px", display: "flex", justifyContent: "center" }}>
      <Loader2 size={16} style={{ color: "var(--gold)", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  if (!quiz) return (
    <div style={{ padding: "16px", textAlign: "center" }}>
      <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "14px", lineHeight: 1.6 }}>
        Nenhum quiz configurado para este módulo.
      </p>
      <button
        onClick={createQuiz}
        disabled={creating}
        className="btn-gold"
        style={{ padding: "10px 22px", fontSize: "9px", borderRadius: "10px", display: "inline-flex", alignItems: "center", gap: "7px" }}
        data-testid="create-quiz-btn"
      >
        {creating
          ? <Loader2 size={12} style={{ animation: "spin 0.8s linear infinite" }} />
          : <><Plus size={12} /> Criar quiz</>
        }
      </button>
    </div>
  );

  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* ── Settings row ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "14px", background: "rgba(198,168,112,0.03)", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <p className="font-label" style={{ fontSize: "8.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold)" }}>
            Configurações do quiz
          </p>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {/* Active toggle */}
            <button
              onClick={() => setQuiz((p) => p ? { ...p, is_active: !p.is_active } : p)}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", cursor: "pointer", color: quiz.is_active ? "var(--sage)" : "var(--text-faint)", fontSize: "11px", transition: "color 0.2s" }}
              aria-label={quiz.is_active ? "Desativar quiz" : "Ativar quiz"}
              data-testid="quiz-active-toggle"
            >
              {quiz.is_active
                ? <ToggleRight size={18} strokeWidth={1.5} />
                : <ToggleLeft  size={18} strokeWidth={1.5} />
              }
              <span>{quiz.is_active ? "Ativo" : "Inativo"}</span>
            </button>
            {/* Delete quiz */}
            <button
              onClick={deleteQuiz}
              style={{ width: "30px", height: "30px", borderRadius: "8px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(172,128,142,0.45)" }}
              aria-label="Remover quiz"
              data-testid="delete-quiz-btn"
            >
              <Trash2 size={13} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <label style={LABEL}>Título do quiz</label>
          <input
            type="text"
            value={quiz.title}
            onChange={(e) => setQuiz((p) => p ? { ...p, title: e.target.value } : p)}
            className="input-dark"
            style={{ borderRadius: "10px" }}
            aria-label="Título do quiz"
            data-testid="quiz-title-input"
          />
        </div>

        {/* Description */}
        <div>
          <label style={LABEL}>Descrição (opcional)</label>
          <textarea
            value={quiz.description ?? ""}
            onChange={(e) => setQuiz((p) => p ? { ...p, description: e.target.value } : p)}
            className="input-dark"
            rows={2}
            style={{ borderRadius: "10px", resize: "none" }}
            placeholder="Teste seus conhecimentos sobre o módulo antes de avançar."
            aria-label="Descrição do quiz"
            data-testid="quiz-description-input"
          />
        </div>

        {/* Passing score + save */}
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={LABEL}>Nota mínima para aprovação (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={quiz.passing_score}
              onChange={(e) => setQuiz((p) => p ? { ...p, passing_score: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) } : p)}
              className="input-dark"
              style={{ width: "100px", borderRadius: "10px", textAlign: "center" }}
              aria-label="Nota mínima"
              data-testid="quiz-passing-score-input"
            />
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="btn-gold"
            style={{ padding: "10px 22px", fontSize: "9px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "7px" }}
            data-testid="save-settings-btn"
          >
            {saving
              ? <Loader2 size={12} style={{ animation: "spin 0.8s linear infinite" }} />
              : <><Check size={12} /> Salvar configurações</>
            }
          </button>
        </div>
      </div>

      {/* ── Questions list ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <p className="font-label" style={{ fontSize: "8.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Perguntas ({quiz.questions.length})
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {quiz.questions.map((q, qIdx) => {
            const isOpen = openQ === q.id;
            const hasCorrect = q.options.some((o) => o.is_correct);
            return (
              <div
                key={q.id}
                style={{ borderRadius: "12px", border: `1px solid ${isOpen ? "rgba(198,168,112,0.28)" : "var(--border-subtle)"}`, overflow: "hidden", transition: "border-color 0.2s" }}
                data-testid={`question-card-${q.id}`}
              >
                {/* Question header */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", background: isOpen ? "rgba(198,168,112,0.04)" : "transparent" }}>
                  <GripVertical size={12} style={{ color: "var(--border-subtle)", flexShrink: 0 }} />
                  <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "rgba(198,168,112,0.10)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontFamily: "Montserrat", fontWeight: 600, flexShrink: 0 }}>
                    {qIdx + 1}
                  </span>
                  <button
                    onClick={() => setOpenQ(isOpen ? null : q.id)}
                    style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", minHeight: "36px", padding: 0 }}
                    aria-label={`Expandir pergunta ${qIdx + 1}`}
                  >
                    <p style={{ flex: 1, fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.4, textAlign: "left" }}>
                      {q.question || <span style={{ color: "var(--text-faint)", fontStyle: "italic" }}>Sem enunciado</span>}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                      <span style={{ fontSize: "8px", fontFamily: "Montserrat", letterSpacing: "0.12em", textTransform: "uppercase", padding: "2px 8px", borderRadius: "100px", background: "rgba(164,158,208,0.10)", color: "var(--lavender)" }}>
                        {q.type === "multiple_choice" ? "múltipla escolha" : "V/F"}
                      </span>
                      {!hasCorrect && (
                        <span title="Nenhuma resposta correta marcada" style={{ color: "rgba(201,80,80,0.7)", display: "flex" }}>
                          <AlertCircle size={12} strokeWidth={1.5} />
                        </span>
                      )}
                      {isOpen ? <ChevronDown size={12} style={{ color: "var(--border-mid)" }} /> : <ChevronRight size={12} style={{ color: "var(--border-mid)" }} />}
                    </div>
                  </button>
                  <button
                    onClick={() => deleteQuestion(q.id)}
                    style={{ width: "26px", height: "26px", borderRadius: "6px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(172,128,142,0.35)", flexShrink: 0 }}
                    aria-label={`Remover pergunta ${qIdx + 1}`}
                    data-testid={`delete-question-${q.id}`}
                  >
                    <Trash2 size={11} strokeWidth={1.5} />
                  </button>
                </div>

                {/* Question body (expanded) */}
                {isOpen && (
                  <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "12px" }}>
                    {/* Edit question text */}
                    <div style={{ marginBottom: "12px" }}>
                      <label style={LABEL}>Enunciado</label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => updateQuestionText(q.id, e.target.value)}
                          className="input-dark"
                          style={{ flex: 1, borderRadius: "10px" }}
                          aria-label="Enunciado da pergunta"
                          data-testid={`question-text-input-${q.id}`}
                        />
                        <button
                          onClick={() => saveQuestionText(q)}
                          className="btn-ghost"
                          style={{ padding: "0 12px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "5px", fontSize: "9px" }}
                          aria-label="Salvar enunciado"
                        >
                          <Check size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Options */}
                    <label style={LABEL}>Opções de resposta</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
                      {q.options.map((opt) => (
                        <div
                          key={opt.id}
                          style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            padding: "8px 10px", borderRadius: "10px",
                            background: opt.is_correct ? "rgba(140,170,150,0.08)" : "rgba(255,255,255,0.025)",
                            border: `1px solid ${opt.is_correct ? "rgba(140,170,150,0.30)" : "var(--border-subtle)"}`,
                            transition: "all 0.18s",
                          }}
                          data-testid={`option-row-${opt.id}`}
                        >
                          {/* Correct toggle */}
                          <button
                            onClick={() => setCorrect(q.id, opt.id)}
                            style={{
                              width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                              background: opt.is_correct ? "rgba(140,170,150,0.25)" : "rgba(255,255,255,0.04)",
                              border: `1.5px solid ${opt.is_correct ? "rgba(140,170,150,0.6)" : "var(--border-mid)"}`,
                              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.18s",
                            }}
                            aria-label={opt.is_correct ? "Opção correta" : "Marcar como correta"}
                            data-testid={`correct-toggle-${opt.id}`}
                          >
                            {opt.is_correct && <Check size={10} style={{ color: "var(--sage)" }} strokeWidth={2.5} />}
                          </button>
                          <span style={{ flex: 1, fontSize: "13px", color: opt.is_correct ? "var(--sage)" : "var(--text-muted)" }}>
                            {opt.text}
                          </span>
                          {/* Don't allow deleting T/F options */}
                          {q.type !== "true_false" && (
                            <button
                              onClick={() => deleteOption(q.id, opt.id)}
                              style={{ width: "22px", height: "22px", borderRadius: "6px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(172,128,142,0.35)", flexShrink: 0 }}
                              aria-label={`Remover opção ${opt.text}`}
                              data-testid={`delete-option-${opt.id}`}
                            >
                              <X size={10} strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add option (only for multiple_choice) */}
                    {q.type === "multiple_choice" && (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          type="text"
                          value={newOptionText[q.id] ?? ""}
                          onChange={(e) => setNewOptionText((p) => ({ ...p, [q.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && addOption(q.id)}
                          placeholder="Nova opção..."
                          className="input-dark"
                          style={{ flex: 1, borderRadius: "10px", fontSize: "13px" }}
                          aria-label="Texto da nova opção"
                          data-testid={`add-option-input-${q.id}`}
                        />
                        <button
                          onClick={() => addOption(q.id)}
                          className="btn-ghost"
                          style={{ padding: "0 12px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "5px", fontSize: "9px" }}
                          aria-label="Adicionar opção"
                          data-testid={`add-option-btn-${q.id}`}
                        >
                          <Plus size={12} /> Adicionar
                        </button>
                      </div>
                    )}

                    {/* True/False hint */}
                    {q.type === "true_false" && (
                      <p style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "4px" }}>
                        Clique no círculo para marcar qual é a resposta correta (Verdadeiro ou Falso).
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty state */}
          {quiz.questions.length === 0 && !showAddQ && (
            <div style={{ padding: "20px", textAlign: "center", borderRadius: "12px", border: "1px dashed var(--border-soft)" }}>
              <p style={{ fontSize: "13px", color: "var(--text-faint)", marginBottom: "12px" }}>Nenhuma pergunta criada ainda.</p>
            </div>
          )}
        </div>

        {/* ── Add question form ── */}
        {showAddQ ? (
          <div style={{ marginTop: "10px", padding: "14px", borderRadius: "12px", border: "1px solid var(--border-soft)", background: "rgba(198,168,112,0.03)" }}>
            <p className="font-label" style={{ fontSize: "8.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "10px" }}>
              Nova pergunta
            </p>
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
              <select
                value={newQType}
                onChange={(e) => setNewQType(e.target.value as QType)}
                className="input-dark"
                style={{ width: "160px", borderRadius: "10px", flexShrink: 0 }}
                aria-label="Tipo de pergunta"
                data-testid="new-question-type"
              >
                <option value="multiple_choice">Múltipla escolha</option>
                <option value="true_false">Verdadeiro / Falso</option>
              </select>
              <input
                type="text"
                value={newQText}
                onChange={(e) => setNewQText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addQuestion()}
                placeholder="Enunciado da pergunta..."
                className="input-dark"
                style={{ flex: 1, borderRadius: "10px", minWidth: "200px" }}
                autoFocus
                aria-label="Enunciado da nova pergunta"
                data-testid="new-question-text"
              />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={addQuestion}
                disabled={addingQ}
                className="btn-gold"
                style={{ padding: "9px 20px", fontSize: "9px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "7px" }}
                data-testid="save-question-btn"
              >
                {addingQ
                  ? <Loader2 size={12} style={{ animation: "spin 0.8s linear infinite" }} />
                  : <><Check size={12} /> Criar pergunta</>
                }
              </button>
              <button
                onClick={() => { setShowAddQ(false); setNewQText(""); }}
                className="btn-ghost"
                style={{ padding: "9px 14px", fontSize: "9px", borderRadius: "10px" }}
                data-testid="cancel-question-btn"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddQ(true)}
            style={{
              marginTop: "8px", width: "100%", display: "flex", alignItems: "center", gap: "8px",
              padding: "11px 16px", background: "transparent", border: "1px dashed var(--border-soft)",
              borderRadius: "10px", cursor: "pointer", color: "rgba(198,168,112,0.55)",
              fontSize: "12px", fontFamily: "DM Sans", transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--gold)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(198,168,112,0.4)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(198,168,112,0.55)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border-soft)"; }}
            data-testid="add-question-btn"
          >
            <Plus size={13} /> Adicionar pergunta
          </button>
        )}
      </div>
    </div>
  );
}
