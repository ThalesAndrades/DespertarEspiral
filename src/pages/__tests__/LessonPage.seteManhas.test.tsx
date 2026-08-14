/**
 * Integration Tests — LessonPage × Sete Manhãs (I-6)
 *
 * A trava do ritmo (`LessonPage.tsx` — redireciona uma manhã bloqueada/amanhã
 * de volta pra trilha) era o único ponto de controle de acesso da leva com
 * cobertura zero. Este arquivo é NOVO — não encosta no `LessonPage.test.tsx`
 * (que já tem 16 falhas pré-existentes de mock, fora de escopo aqui).
 *
 * Mock pattern copiado do `CourseViewPage.seteManhas.test.tsx` irmão (o select
 * real da página é `.eq().eq()`, sem `.in()` — diferente do mock quebrado do
 * LessonPage.test.tsx antigo).
 *
 * Casos mínimos exigidos pela revisão:
 *  1. aula bloqueada redireciona (Navigate) para a trilha
 *  2. aula com is_free_preview NÃO redireciona
 *  3. aula disponível renderiza normal
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/* ── DashboardLayout ── */
vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

/* ── Toast (evita ruido de console; nao usado nos casos abaixo) ── */
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

/* ── useAuth ── */
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

/* ── Supabase ── */
const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

/* ──────────────────────────────────────────────────────────── */
/* Test data                                                    */
/* ──────────────────────────────────────────────────────────── */

const SETE_MANHAS_LESSONS = Array.from({ length: 7 }, (_, i) => ({
  id: `sm-lesson-${i + 1}`,
  module_id: "mod-sete-manhas",
  title: `Manhã ${i + 1}`,
  type: "text",
  content: `<p>Conteúdo da manhã ${i + 1}.</p>`,
  sort_order: i + 1,
  is_free: i === 2, // manha 3 (indice 2) e previa gratuita
}));

const PRODUCT_SETE_MANHAS = {
  id: "prod-sete-manhas",
  slug: "sete-manhas",
  title: "Sete Manhãs",
  subtitle: "Uma manhã por dia",
  certificate_config: null,
  modules: [
    { id: "mod-sete-manhas", title: "Sete Manhãs", sort_order: 1, lessons: SETE_MANHAS_LESSONS },
  ],
};

const AUTH_USER = {
  id: "user-sm-001",
  email: "aluna@espiral.com",
  name: "Aluna Espiral",
  role: "member" as const,
  anonymous_name: "Lua Nova",
  products: ["sete-manhas"],
};

/* ──────────────────────────────────────────────────────────── */
/* Mock setup helper                                             */
/* ──────────────────────────────────────────────────────────── */

function setupSupabaseMocks({
  productData,
  progressRows = [] as { lesson_id: string; completed_at: string }[],
  lessonId,
}: {
  productData: Record<string, unknown> | null;
  progressRows?: { lesson_id: string; completed_at: string }[];
  lessonId: string;
}) {
  const single = vi.fn().mockResolvedValue({
    data: productData,
    error: productData ? null : { message: "Not found" },
  });
  const eqSlug = vi.fn().mockReturnValue({ single });
  const productSelect = vi.fn().mockReturnValue({ eq: eqSlug });

  // .select("lesson_id, completed_at").eq("user_id", ...).eq("completed", true)
  const progressEq2 = vi.fn().mockResolvedValue({ data: progressRows, error: null });
  const progressEq1 = vi.fn().mockReturnValue({ eq: progressEq2 });
  const progressSelect = vi.fn().mockReturnValue({ eq: progressEq1 });

  // .select(...).eq("id", lessonId).maybeSingle()
  const lessonRow = SETE_MANHAS_LESSONS.find((l) => l.id === lessonId) ?? null;
  const maybeSingle = vi.fn().mockResolvedValue({ data: lessonRow, error: null });
  const lessonEq = vi.fn().mockReturnValue({ maybeSingle });
  const lessonSelect = vi.fn().mockReturnValue({ eq: lessonEq });

  mockFrom.mockImplementation((table: string) => {
    if (table === "products") return { select: productSelect };
    if (table === "lesson_progress") return { select: progressSelect };
    if (table === "lessons") return { select: lessonSelect };
    return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
  });
}

/** ISO timestamp for "ontem" (24h before now) — sempre o dia-calendario anterior em SP. */
function ontemISO(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

/* Render LessonPage at /products/:slug/lesson/:lessonId */
function renderLesson(slug: string, lessonId: string) {
  return render(
    <MemoryRouter initialEntries={[`/products/${slug}/lesson/${lessonId}`]}>
      <Routes>
        <Route path="/products/:slug/lesson/:lessonId" element={<LessonPage />} />
        <Route path="/products/:slug" element={<div data-testid="course-page">Curso</div>} />
        <Route path="/products" element={<div data-testid="products-page">Produtos</div>} />
        <Route path="/checkout/:slug" element={<div data-testid="checkout-page">Checkout</div>} />
      </Routes>
    </MemoryRouter>
  );
}

let LessonPage: typeof import("@/pages/LessonPage").default;

beforeEach(async () => {
  vi.clearAllMocks();

  if (!LessonPage) {
    const mod = await import("@/pages/LessonPage");
    LessonPage = mod.default;
  }
});

/* ──────────────────────────────────────────────────────────── */

describe("LessonPage — trava do ritmo do Sete Manhãs (I-6)", () => {
  it("aula bloqueada redireciona (Navigate) de volta pra trilha", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER, loading: false });
    // Nenhuma manha concluida: manha 1 = disponivel, manha 2 = bloqueada.
    setupSupabaseMocks({
      productData: PRODUCT_SETE_MANHAS,
      progressRows: [],
      lessonId: "sm-lesson-2",
    });

    renderLesson("sete-manhas", "sm-lesson-2");

    await waitFor(() => {
      expect(screen.getByTestId("course-page")).toBeInTheDocument();
    });
    expect(screen.queryByText("Manhã 2")).not.toBeInTheDocument();
  });

  it("aula com is_free (previa gratuita) NAO redireciona mesmo bloqueada pelo ritmo", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER, loading: false });
    // Manha 3 (indice 2) e is_free — escapa da trava mesmo sem nenhuma manha concluida.
    setupSupabaseMocks({
      productData: PRODUCT_SETE_MANHAS,
      progressRows: [],
      lessonId: "sm-lesson-3",
    });

    renderLesson("sete-manhas", "sm-lesson-3");

    // "Manhã 3" aparece tanto no <h1> da aula quanto no link ativo da sidebar
    // — getAllByText porque o texto e duplicado de proposito (item ativo).
    await waitFor(() => {
      expect(screen.getAllByText("Manhã 3").length).toBeGreaterThan(0);
    });
    expect(screen.queryByTestId("course-page")).not.toBeInTheDocument();
  });

  it("aula disponivel renderiza normal (sem redirect)", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER, loading: false });
    // Manha 1 concluida ontem libera a manha 2 hoje.
    setupSupabaseMocks({
      productData: PRODUCT_SETE_MANHAS,
      progressRows: [{ lesson_id: "sm-lesson-1", completed_at: ontemISO() }],
      lessonId: "sm-lesson-2",
    });

    renderLesson("sete-manhas", "sm-lesson-2");

    await waitFor(() => {
      expect(screen.getAllByText("Manhã 2").length).toBeGreaterThan(0);
    });
    expect(screen.queryByTestId("course-page")).not.toBeInTheDocument();
  });

  it("produto que NAO e sete-manhas nunca redireciona pela trava do ritmo", async () => {
    mockUseAuth.mockReturnValue({
      user: { ...AUTH_USER, products: ["mulher-espiral"] },
      loading: false,
    });
    const productOutro = {
      id: "prod-outro",
      slug: "mulher-espiral",
      title: "Mulher Espiral",
      subtitle: "Autoconhecimento",
      certificate_config: null,
      modules: [
        {
          id: "mod-outro",
          title: "Módulo 1",
          sort_order: 1,
          lessons: [
            { id: "les-outro-1", module_id: "mod-outro", title: "Aula 1", type: "text", content: "<p>Ola</p>", sort_order: 1, is_free: false },
            { id: "les-outro-2", module_id: "mod-outro", title: "Aula 2", type: "text", content: "<p>Ola 2</p>", sort_order: 2, is_free: false },
          ],
        },
      ],
    };
    const single = vi.fn().mockResolvedValue({ data: productOutro, error: null });
    const eqSlug = vi.fn().mockReturnValue({ single });
    const productSelect = vi.fn().mockReturnValue({ eq: eqSlug });

    const progressEq2 = vi.fn().mockResolvedValue({ data: [], error: null });
    const progressEq1 = vi.fn().mockReturnValue({ eq: progressEq2 });
    const progressSelect = vi.fn().mockReturnValue({ eq: progressEq1 });

    const maybeSingle = vi.fn().mockResolvedValue({ data: productOutro.modules[0].lessons[1], error: null });
    const lessonEq = vi.fn().mockReturnValue({ maybeSingle });
    const lessonSelect = vi.fn().mockReturnValue({ eq: lessonEq });

    mockFrom.mockImplementation((table: string) => {
      if (table === "products") return { select: productSelect };
      if (table === "lesson_progress") return { select: progressSelect };
      if (table === "lessons") return { select: lessonSelect };
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderLesson("mulher-espiral", "les-outro-2");

    await waitFor(() => {
      expect(screen.getAllByText("Aula 2").length).toBeGreaterThan(0);
    });
    expect(screen.queryByTestId("course-page")).not.toBeInTheDocument();
  });
});
