/**
 * Unit / Integration Tests — QuizEditor
 *
 * Covers:
 *  - Loading spinner while quiz data loads
 *  - Empty state when no quiz exists → "Criar quiz" button
 *  - "Criar quiz" calls supabase.insert on module_quizzes
 *  - Quiz settings panel: title input, description textarea, passing score
 *  - Active toggle (aria-label "Ativar quiz" / "Desativar quiz")
 *  - "Salvar configurações" calls supabase.update on module_quizzes with correct payload
 *  - "Remover quiz" calls supabase.delete + sets quiz back to null state
 *  - Questions list rendered with question text and type badge
 *  - AlertCircle warning when question has no correct option
 *  - "Adicionar pergunta" button shows add-question form
 *  - Add question: type selector (multiple_choice | true_false)
 *  - Add question: supabase.insert on quiz_questions with correct payload
 *  - Add question: true_false auto-creates "Verdadeiro" / "Falso" options
 *  - Add question: empty text shows toast.error, no insert
 *  - Add question: cancel hides form
 *  - Expanding a question shows its options list
 *  - Options rendered with correct-toggle circle + text
 *  - Marking option as correct calls supabase.update for all options in question
 *  - Correct option has visual indicator (Check icon)
 *  - "Adicionar opção" input + button appends option via supabase.insert
 *  - Deleting option calls supabase.delete and removes from list
 *  - "Remover pergunta" calls supabase.delete and removes from list
 *  - True/false questions don't show delete-option buttons
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/* ── Sonner toast ── */
const mockToastError   = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error:   (...a: unknown[]) => mockToastError(...a),
    success: (...a: unknown[]) => mockToastSuccess(...a),
  },
}));

/* ── window.confirm ── */
vi.stubGlobal("confirm", () => true);

/* ── Supabase ── */
const mockFrom   = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: { from: (...a: unknown[]) => mockFrom(...a) },
}));

/* ─────────────────────────────────────────────────────────────── */
/* Test data                                                       */
/* ─────────────────────────────────────────────────────────────── */

const QUIZ_ROW = {
  id:            "quiz-001",
  module_id:     "mod-001",
  title:         "Quiz do Módulo 1",
  description:   "Teste seus conhecimentos.",
  passing_score: 70,
  is_active:     true,
};

const QUESTION_MC = {
  id:         "q-001",
  quiz_id:    "quiz-001",
  question:   "O que é meditação?",
  type:       "multiple_choice",
  sort_order: 1,
};

const QUESTION_TF = {
  id:         "q-002",
  quiz_id:    "quiz-001",
  question:   "Yoga e meditação são práticas complementares?",
  type:       "true_false",
  sort_order: 2,
};

const OPTIONS_MC = [
  { id: "opt-001", question_id: "q-001", text: "Prática de atenção plena",  is_correct: true,  sort_order: 1 },
  { id: "opt-002", question_id: "q-001", text: "Exercício físico intenso",  is_correct: false, sort_order: 2 },
  { id: "opt-003", question_id: "q-001", text: "Técnica de relaxamento puro", is_correct: false, sort_order: 3 },
];

const OPTIONS_TF = [
  { id: "opt-tf-1", question_id: "q-002", text: "Verdadeiro", is_correct: true,  sort_order: 1 },
  { id: "opt-tf-2", question_id: "q-002", text: "Falso",      is_correct: false, sort_order: 2 },
];

/* ─────────────────────────────────────────────────────────────── */
/* Supabase mock helpers                                           */
/* ─────────────────────────────────────────────────────────────── */

function setupMocks({
  quizRow      = QUIZ_ROW as typeof QUIZ_ROW | null,
  questions    = [QUESTION_MC, QUESTION_TF],
  options      = [...OPTIONS_MC, ...OPTIONS_TF],
  updateError  = null as null | { message: string },
  deleteError  = null as null | { message: string },
  insertQuizResult  = { data: QUIZ_ROW, error: null },
  insertQResult     = { data: { ...QUESTION_MC, id: "q-new" }, error: null },
  insertOptResult   = { data: { id: "opt-new", question_id: "q-001", text: "Nova opção", is_correct: false, sort_order: 4 }, error: null },
  tfOptionsResult   = { data: OPTIONS_TF.map(o => ({ ...o, id: `tf-auto-${o.sort_order}`, question_id: "q-new-tf" })), error: null },
} = {}) {
  mockUpdate.mockResolvedValue({ error: updateError });
  mockDelete.mockResolvedValue({ error: deleteError });

  mockFrom.mockImplementation((table: string) => {
    /* module_quizzes */
    if (table === "module_quizzes") {
      const maybeSingle = vi.fn().mockResolvedValue({ data: quizRow, error: null });
      const eqActive    = vi.fn().mockReturnValue({ maybeSingle });
      const eqMod       = vi.fn().mockReturnValue({ maybeSingle }); // .eq("module_id", …)

      const selectChain = vi.fn().mockReturnValue({ eq: eqMod });

      const insertSelect = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(insertQuizResult) });
      const insert = vi.fn().mockReturnValue({ select: insertSelect });

      const updateEq = vi.fn().mockResolvedValue({ error: updateError });
      const update   = vi.fn().mockReturnValue({ eq: updateEq });

      const deleteEq = vi.fn().mockResolvedValue({ error: deleteError });
      const del      = vi.fn().mockReturnValue({ eq: deleteEq });

      return { select: selectChain, insert, update, delete: del };
    }

    /* quiz_questions */
    if (table === "quiz_questions") {
      const order    = vi.fn().mockResolvedValue({ data: questions, error: null });
      const eqQuiz   = vi.fn().mockReturnValue({ order });
      const select   = vi.fn().mockReturnValue({ eq: eqQuiz });

      const insertSelect = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(insertQResult) });
      const insert = vi.fn().mockReturnValue({ select: insertSelect });

      const updateEq = vi.fn().mockResolvedValue({ error: updateError });
      const update   = vi.fn().mockReturnValue({ eq: updateEq });

      const deleteEq = vi.fn().mockResolvedValue({ error: deleteError });
      const del      = vi.fn().mockReturnValue({ eq: deleteEq });

      return { select, insert, update, delete: del };
    }

    /* quiz_options */
    if (table === "quiz_options") {
      const order  = vi.fn().mockResolvedValue({ data: options, error: null });
      const inFn   = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ in: inFn });

      const insertSelect = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(insertOptResult) });
      const insertTFSelect = vi.fn().mockResolvedValue(tfOptionsResult);
      // First insert call for TF creates 2 options; subsequent single-option inserts return insertOptResult
      let insertCallCount = 0;
      const insert = vi.fn().mockImplementation(() => {
        insertCallCount++;
        return { select: insertCallCount === 1 && !quizRow ? insertTFSelect : insertSelect };
      });

      const updateEq = vi.fn().mockResolvedValue({ error: updateError });
      const update   = vi.fn().mockReturnValue({ eq: updateEq });

      const deleteEq = vi.fn().mockResolvedValue({ error: deleteError });
      const del      = vi.fn().mockReturnValue({ eq: deleteEq });

      return { select, insert, update, delete: del };
    }

    return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
  });
}

/* Render QuizEditor */
function renderEditor(moduleId = "mod-001", productId = "prod-001") {
  return render(<QuizEditor moduleId={moduleId} productId={productId} />);
}

let QuizEditor: typeof import("@/components/features/QuizEditor").default;

beforeEach(async () => {
  vi.clearAllMocks();
  if (!QuizEditor) {
    const mod = await import("@/components/features/QuizEditor");
    QuizEditor = mod.default;
  }
});

/* ─────────────────────────────────────────────────────────────── */
/* Loading state                                                   */
/* ─────────────────────────────────────────────────────────────── */

describe("QuizEditor — loading", () => {
  it("shows spinner while data is loading", () => {
    let resolve: (v: unknown) => void;
    const pending = new Promise((r) => { resolve = r; });

    mockFrom.mockImplementation((table: string) => {
      if (table === "module_quizzes") {
        const maybeSingle = vi.fn().mockReturnValue(pending);
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }) };
      }
      return { select: vi.fn() };
    });

    renderEditor();
    // Loader2 svg should be visible
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
    // Quiz title not yet visible
    expect(screen.queryByText("Quiz do Módulo 1")).not.toBeInTheDocument();
    resolve!({ data: null, error: null });
  });
});

/* ─────────────────────────────────────────────────────────────── */
/* No quiz state                                                   */
/* ─────────────────────────────────────────────────────────────── */

describe("QuizEditor — no quiz", () => {
  it("shows 'Nenhum quiz configurado' and 'Criar quiz' button", async () => {
    setupMocks({ quizRow: null, questions: [], options: [] });
    renderEditor();

    await waitFor(() => {
      expect(screen.getByText(/nenhum quiz configurado/i)).toBeInTheDocument();
      expect(screen.getByTestId("create-quiz-btn")).toBeInTheDocument();
    });
  });

  it("clicking 'Criar quiz' calls supabase.insert on module_quizzes", async () => {
    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: QUIZ_ROW, error: null }) }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "module_quizzes") {
        const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }),
          insert: insertSpy,
        };
      }
      return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderEditor();
    await waitFor(() => expect(screen.getByTestId("create-quiz-btn")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId("create-quiz-btn"));

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ module_id: "mod-001", passing_score: 70, is_active: true })
      );
    });
  });

  it("shows toast.success after creating quiz", async () => {
    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: QUIZ_ROW, error: null }) }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "module_quizzes") {
        const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }),
          insert: insertSpy,
        };
      }
      if (table === "quiz_questions") {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) }) };
      }
      return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderEditor();
    await waitFor(() => expect(screen.getByTestId("create-quiz-btn")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId("create-quiz-btn"));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Quiz criado. ✦");
    });
  });
});

/* ─────────────────────────────────────────────────────────────── */
/* Quiz settings                                                   */
/* ─────────────────────────────────────────────────────────────── */

describe("QuizEditor — quiz settings", () => {
  it("renders quiz title input pre-filled", async () => {
    setupMocks();
    renderEditor();

    await waitFor(() => {
      const input = screen.getByTestId("quiz-title-input") as HTMLInputElement;
      expect(input.value).toBe("Quiz do Módulo 1");
    });
  });

  it("renders quiz description textarea pre-filled", async () => {
    setupMocks();
    renderEditor();

    await waitFor(() => {
      const ta = screen.getByTestId("quiz-description-input") as HTMLTextAreaElement;
      expect(ta.value).toBe("Teste seus conhecimentos.");
    });
  });

  it("renders passing score input pre-filled with 70", async () => {
    setupMocks();
    renderEditor();

    await waitFor(() => {
      const input = screen.getByTestId("quiz-passing-score-input") as HTMLInputElement;
      expect(Number(input.value)).toBe(70);
    });
  });

  it("quiz is active — toggle shows 'Desativar quiz' aria-label", async () => {
    setupMocks();
    renderEditor();

    await waitFor(() => {
      expect(screen.getByLabelText(/desativar quiz/i)).toBeInTheDocument();
    });
  });

  it("clicking active toggle switches to 'Ativar quiz'", async () => {
    setupMocks();
    renderEditor();

    await waitFor(() => expect(screen.getByLabelText(/desativar quiz/i)).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId("quiz-active-toggle"));

    await waitFor(() => {
      expect(screen.getByLabelText(/ativar quiz/i)).toBeInTheDocument();
    });
  });

  it("'Salvar configurações' calls supabase.update with title, passing_score, is_active", async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "module_quizzes") {
        const maybeSingle = vi.fn().mockResolvedValue({ data: QUIZ_ROW, error: null });
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }),
          update: updateSpy,
        };
      }
      if (table === "quiz_questions") {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) }) };
      }
      return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderEditor();
    await waitFor(() => expect(screen.getByTestId("save-settings-btn")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId("save-settings-btn"));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title:         "Quiz do Módulo 1",
          passing_score: 70,
          is_active:     true,
        })
      );
    });
  });

  it("shows toast.success after saving settings", async () => {
    setupMocks();
    renderEditor();
    await waitFor(() => expect(screen.getByTestId("save-settings-btn")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId("save-settings-btn"));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Configurações salvas. ✦");
    });
  });

  it("'Remover quiz' calls supabase.delete and resets to empty state", async () => {
    const deleteSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "module_quizzes") {
        const maybeSingle = vi.fn().mockResolvedValue({ data: QUIZ_ROW, error: null });
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }),
          delete: deleteSpy,
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      if (table === "quiz_questions") {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) }) };
      }
      return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderEditor();
    await waitFor(() => expect(screen.getByTestId("delete-quiz-btn")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId("delete-quiz-btn"));

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalled();
      expect(screen.getByTestId("create-quiz-btn")).toBeInTheDocument();
    });
  });
});

/* ─────────────────────────────────────────────────────────────── */
/* Questions list                                                  */
/* ─────────────────────────────────────────────────────────────── */

describe("QuizEditor — questions list", () => {
  it("renders multiple_choice question text", async () => {
    setupMocks();
    renderEditor();

    await waitFor(() => {
      expect(screen.getByText("O que é meditação?")).toBeInTheDocument();
    });
  });

  it("renders true_false question text", async () => {
    setupMocks();
    renderEditor();

    await waitFor(() => {
      expect(screen.getByText("Yoga e meditação são práticas complementares?")).toBeInTheDocument();
    });
  });

  it("renders type badge 'múltipla escolha' for MC questions", async () => {
    setupMocks();
    renderEditor();

    await waitFor(() => {
      expect(screen.getAllByText(/múltipla escolha/i).length).toBeGreaterThan(0);
    });
  });

  it("renders type badge 'V/F' for true_false questions", async () => {
    setupMocks();
    renderEditor();

    await waitFor(() => {
      expect(screen.getAllByText("V/F").length).toBeGreaterThan(0);
    });
  });

  it("expanding a question reveals its options", async () => {
    setupMocks();
    renderEditor();

    await waitFor(() => expect(screen.getByText("O que é meditação?")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByLabelText(/expandir pergunta 1/i));

    await waitFor(() => {
      expect(screen.getByText("Prática de atenção plena")).toBeInTheDocument();
      expect(screen.getByText("Exercício físico intenso")).toBeInTheDocument();
    });
  });

  it("correct option has visual Check indicator after expanding", async () => {
    setupMocks();
    renderEditor();

    await waitFor(() => expect(screen.getByText("O que é meditação?")).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByLabelText(/expandir pergunta 1/i));

    await waitFor(() => {
      // The correct option toggle should have aria-label "Opção correta"
      expect(screen.getByLabelText("Opção correta")).toBeInTheDocument();
    });
  });

  it("incorrect options have aria-label 'Marcar como correta'", async () => {
    setupMocks();
    renderEditor();

    await waitFor(() => expect(screen.getByText("O que é meditação?")).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByLabelText(/expandir pergunta 1/i));

    await waitFor(() => {
      const markCorrectBtns = screen.getAllByLabelText("Marcar como correta");
      expect(markCorrectBtns.length).toBeGreaterThanOrEqual(2); // two incorrect options
    });
  });

  it("delete question button calls supabase.delete and removes question from list", async () => {
    const deleteQSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "module_quizzes") {
        const maybeSingle = vi.fn().mockResolvedValue({ data: QUIZ_ROW, error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }), update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      }
      if (table === "quiz_questions") {
        const order = vi.fn().mockResolvedValue({ data: [QUESTION_MC, QUESTION_TF], error: null });
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order }) }),
          delete: deleteQSpy,
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          insert: vi.fn(),
        };
      }
      return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [...OPTIONS_MC, ...OPTIONS_TF], error: null }) }) };
    });

    renderEditor();
    await waitFor(() => expect(screen.getByTestId(`delete-question-${QUESTION_MC.id}`)).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId(`delete-question-${QUESTION_MC.id}`));

    await waitFor(() => {
      expect(deleteQSpy).toHaveBeenCalled();
      expect(screen.queryByText("O que é meditação?")).not.toBeInTheDocument();
    });
  });
});

/* ─────────────────────────────────────────────────────────────── */
/* Add question                                                    */
/* ─────────────────────────────────────────────────────────────── */

describe("QuizEditor — add question", () => {
  it("clicking 'Adicionar pergunta' shows the add-question form", async () => {
    setupMocks();
    renderEditor();

    await waitFor(() => expect(screen.getByTestId("add-question-btn")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId("add-question-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("new-question-text")).toBeInTheDocument();
    });
  });

  it("add question with multiple_choice calls supabase.insert with correct type", async () => {
    const insertQSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { ...QUESTION_MC, id: "q-new" }, error: null }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "module_quizzes") {
        const maybeSingle = vi.fn().mockResolvedValue({ data: QUIZ_ROW, error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }), update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      }
      if (table === "quiz_questions") {
        const order = vi.fn().mockResolvedValue({ data: [], error: null });
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order }) }),
          insert: insertQSpy,
        };
      }
      return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderEditor();
    await waitFor(() => expect(screen.getByTestId("add-question-btn")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId("add-question-btn"));
    await waitFor(() => expect(screen.getByTestId("new-question-text")).toBeInTheDocument());

    await user.type(screen.getByTestId("new-question-text"), "O que é yoga?");
    await user.click(screen.getByTestId("save-question-btn"));

    await waitFor(() => {
      expect(insertQSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          quiz_id:  "quiz-001",
          question: "O que é yoga?",
          type:     "multiple_choice",
        })
      );
    });
  });

  it("add question with true_false type auto-creates Verdadeiro/Falso options", async () => {
    const insertQSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { ...QUESTION_TF, id: "q-new-tf" }, error: null }),
      }),
    });

    const insertOptSpy = vi.fn().mockResolvedValue({
      data: [
        { id: "auto-1", question_id: "q-new-tf", text: "Verdadeiro", is_correct: true,  sort_order: 1 },
        { id: "auto-2", question_id: "q-new-tf", text: "Falso",      is_correct: false, sort_order: 2 },
      ],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "module_quizzes") {
        const maybeSingle = vi.fn().mockResolvedValue({ data: QUIZ_ROW, error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }), update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      }
      if (table === "quiz_questions") {
        const order = vi.fn().mockResolvedValue({ data: [], error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order }) }), insert: insertQSpy };
      }
      if (table === "quiz_options") {
        return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }), insert: insertOptSpy };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderEditor();
    await waitFor(() => expect(screen.getByTestId("add-question-btn")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId("add-question-btn"));
    await waitFor(() => expect(screen.getByTestId("new-question-type")).toBeInTheDocument());

    // Select true_false
    await user.selectOptions(screen.getByTestId("new-question-type"), "true_false");
    await user.type(screen.getByTestId("new-question-text"), "Yoga é uma prática ancestral?");
    await user.click(screen.getByTestId("save-question-btn"));

    await waitFor(() => {
      expect(insertOptSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ text: "Verdadeiro", is_correct: true }),
          expect.objectContaining({ text: "Falso", is_correct: false }),
        ])
      );
    });
  });

  it("empty question text shows toast.error and no insert", async () => {
    const insertSpy = vi.fn();
    mockFrom.mockImplementation((table: string) => {
      if (table === "module_quizzes") {
        const maybeSingle = vi.fn().mockResolvedValue({ data: QUIZ_ROW, error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }), update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      }
      if (table === "quiz_questions") {
        const order = vi.fn().mockResolvedValue({ data: [], error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order }) }), insert: insertSpy };
      }
      return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderEditor();
    await waitFor(() => expect(screen.getByTestId("add-question-btn")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId("add-question-btn"));
    await waitFor(() => expect(screen.getByTestId("save-question-btn")).toBeInTheDocument());

    // Don't type anything
    await user.click(screen.getByTestId("save-question-btn"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Digite o enunciado da pergunta.");
    });
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("cancel button hides the add-question form", async () => {
    setupMocks();
    renderEditor();

    await waitFor(() => expect(screen.getByTestId("add-question-btn")).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByTestId("add-question-btn"));
    await waitFor(() => expect(screen.getByTestId("cancel-question-btn")).toBeInTheDocument());

    await user.click(screen.getByTestId("cancel-question-btn"));
    await waitFor(() => {
      expect(screen.queryByTestId("cancel-question-btn")).not.toBeInTheDocument();
      expect(screen.getByTestId("add-question-btn")).toBeInTheDocument();
    });
  });
});

/* ─────────────────────────────────────────────────────────────── */
/* Options management                                              */
/* ─────────────────────────────────────────────────────────────── */

describe("QuizEditor — options management", () => {
  it("marking an option as correct calls supabase.update for all options", async () => {
    const updateOptSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "module_quizzes") {
        const maybeSingle = vi.fn().mockResolvedValue({ data: QUIZ_ROW, error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }), update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      }
      if (table === "quiz_questions") {
        const order = vi.fn().mockResolvedValue({ data: [QUESTION_MC], error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order }) }), delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      }
      if (table === "quiz_options") {
        const inFn = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: OPTIONS_MC, error: null }) });
        return {
          select: vi.fn().mockReturnValue({ in: inFn }),
          update: updateOptSpy,
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }) }),
        };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderEditor();
    await waitFor(() => expect(screen.getByText("O que é meditação?")).toBeInTheDocument());

    const user = userEvent.setup();
    // Expand the question
    await user.click(screen.getByLabelText(/expandir pergunta 1/i));
    await waitFor(() => expect(screen.getByText("Exercício físico intenso")).toBeInTheDocument());

    // Click "Marcar como correta" on the second option (currently incorrect)
    const markBtns = screen.getAllByLabelText("Marcar como correta");
    await user.click(markBtns[0]);

    await waitFor(() => {
      // update should have been called for all 3 options
      expect(updateOptSpy).toHaveBeenCalledTimes(OPTIONS_MC.length);
    });
  });

  it("adding an option via input + button calls supabase.insert on quiz_options", async () => {
    const insertOptSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "opt-new", question_id: "q-001", text: "Quarta opção", is_correct: false, sort_order: 4 },
          error: null,
        }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "module_quizzes") {
        const maybeSingle = vi.fn().mockResolvedValue({ data: QUIZ_ROW, error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }), update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      }
      if (table === "quiz_questions") {
        const order = vi.fn().mockResolvedValue({ data: [QUESTION_MC], error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order }) }), delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      }
      if (table === "quiz_options") {
        const inFn = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: OPTIONS_MC, error: null }) });
        return {
          select: vi.fn().mockReturnValue({ in: inFn }),
          insert: insertOptSpy,
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderEditor();
    await waitFor(() => expect(screen.getByText("O que é meditação?")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByLabelText(/expandir pergunta 1/i));

    await waitFor(() => expect(screen.getByTestId(`add-option-input-${QUESTION_MC.id}`)).toBeInTheDocument());

    await user.type(screen.getByTestId(`add-option-input-${QUESTION_MC.id}`), "Quarta opção");
    await user.click(screen.getByTestId(`add-option-btn-${QUESTION_MC.id}`));

    await waitFor(() => {
      expect(insertOptSpy).toHaveBeenCalledWith(
        expect.objectContaining({ question_id: "q-001", text: "Quarta opção", is_correct: false })
      );
    });
  });

  it("added option appears in the list", async () => {
    const insertOptSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "opt-new", question_id: "q-001", text: "Meditação mindfulness", is_correct: false, sort_order: 4 },
          error: null,
        }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "module_quizzes") {
        const maybeSingle = vi.fn().mockResolvedValue({ data: QUIZ_ROW, error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }), update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      }
      if (table === "quiz_questions") {
        const order = vi.fn().mockResolvedValue({ data: [QUESTION_MC], error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order }) }), delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      }
      if (table === "quiz_options") {
        const inFn = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: OPTIONS_MC, error: null }) });
        return { select: vi.fn().mockReturnValue({ in: inFn }), insert: insertOptSpy, update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }), delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderEditor();
    await waitFor(() => expect(screen.getByText("O que é meditação?")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByLabelText(/expandir pergunta 1/i));
    await waitFor(() => expect(screen.getByTestId(`add-option-input-${QUESTION_MC.id}`)).toBeInTheDocument());

    await user.type(screen.getByTestId(`add-option-input-${QUESTION_MC.id}`), "Meditação mindfulness");
    await user.click(screen.getByTestId(`add-option-btn-${QUESTION_MC.id}`));

    await waitFor(() => {
      expect(screen.getByText("Meditação mindfulness")).toBeInTheDocument();
    });
  });

  it("deleting an option calls supabase.delete and removes from list", async () => {
    const deleteOptSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "module_quizzes") {
        const maybeSingle = vi.fn().mockResolvedValue({ data: QUIZ_ROW, error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }), update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      }
      if (table === "quiz_questions") {
        const order = vi.fn().mockResolvedValue({ data: [QUESTION_MC], error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order }) }), delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      }
      if (table === "quiz_options") {
        const inFn = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: OPTIONS_MC, error: null }) });
        return { select: vi.fn().mockReturnValue({ in: inFn }), delete: deleteOptSpy, update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }), insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }) }) };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderEditor();
    await waitFor(() => expect(screen.getByText("O que é meditação?")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByLabelText(/expandir pergunta 1/i));
    await waitFor(() => expect(screen.getByTestId(`delete-option-${OPTIONS_MC[1].id}`)).toBeInTheDocument());

    await user.click(screen.getByTestId(`delete-option-${OPTIONS_MC[1].id}`));

    await waitFor(() => {
      expect(deleteOptSpy).toHaveBeenCalled();
      expect(screen.queryByText("Exercício físico intenso")).not.toBeInTheDocument();
    });
  });

  it("true_false questions do NOT show delete-option buttons", async () => {
    setupMocks({ questions: [QUESTION_TF], options: OPTIONS_TF });
    renderEditor();

    await waitFor(() => expect(screen.getByText("Yoga e meditação são práticas complementares?")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByLabelText(/expandir pergunta 1/i));

    await waitFor(() => expect(screen.getByText("Verdadeiro")).toBeInTheDocument());

    // Delete buttons for options should NOT exist
    const delBtns = screen.queryAllByTestId(/^delete-option-/);
    expect(delBtns.length).toBe(0);
  });
});
