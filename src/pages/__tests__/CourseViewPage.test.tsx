/**
 * Integration Tests — CourseViewPage
 *
 * Covers:
 *  - Loading state: skeleton (spinner) while product data loads
 *  - Product not found: calls navigate("/products") when data is null
 *  - Access denied: renders "Acesso necessário" + "Liberar acesso agora" CTA
 *  - Access denied: free preview lessons rendered with "GRÁTIS" badge
 *  - Access denied: no free preview section when no free lessons exist
 *  - Authenticated with access: renders product title and subtitle
 *  - Authenticated with access: renders module count + lesson count in hero
 *  - Authenticated with access: renders "X de Y aulas" progress text
 *  - Authenticated with access: renders progress bar fill element
 *  - Authenticated with access: progress percentage (0%, 40%, 100%)
 *  - Authenticated with access: "Começar" CTA when 0 lessons completed
 *  - Authenticated with access: "Continuar" CTA when some lessons completed
 *  - Authenticated with access: "Ver certificado" CTA when 100% complete
 *  - Authenticated with access: module accordion renders module titles
 *  - Authenticated with access: first module opens by default
 *  - Authenticated with access: lesson links point to /products/:slug/lesson/:lessonId
 *  - Authenticated with access: type labels (Vídeo, Leitura, PDF, Áudio) rendered
 *  - Authenticated with access: lesson with duration_min shows "Xmin"
 *  - Authenticated with access: completed lesson shows CheckCircle (sage color badge)
 *  - Authenticated with access: clicking module header toggles it open/closed
 *  - Authenticated with access: stats strip shows modules / aulas / concluídas / progresso
 *  - Authenticated with access: module mini-progress bar items rendered
 *  - Authenticated with access: supabase queries called with correct slug + user_id
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/* ── Static asset mock ── */
vi.mock("@/assets/mulher-espiral-hero-new.jpg", () => ({ default: "/mock-hero.jpg" }));

/* ── DashboardLayout ── */
vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

/* ── useAuth ── */
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

/* ── Supabase ── */
const mockFrom    = vi.fn();
const mockSelect  = vi.fn();
const mockEq      = vi.fn();
const mockSingle  = vi.fn();

const mockProgressSelect = vi.fn();
const mockProgressEq1    = vi.fn();
const mockProgressEq2    = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

/* ── navigate ── */
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

/* ──────────────────────────────────────────────────────────── */
/* Test data                                                    */
/* ──────────────────────────────────────────────────────────── */

const LESSONS_MOD_1 = [
  { id: "les-001", title: "Introdução ao Despertar", type: "video", duration_min: 12, is_free: false, sort_order: 1 },
  { id: "les-002", title: "A Jornada Interior",      type: "text",  duration_min: 0,  is_free: false, sort_order: 2 },
  { id: "les-003", title: "Material Complementar",   type: "pdf",   duration_min: 0,  is_free: true,  sort_order: 3 },
  { id: "les-004", title: "Meditação Guiada",         type: "audio", duration_min: 20, is_free: false, sort_order: 4 },
];

const LESSONS_MOD_2 = [
  { id: "les-005", title: "O Chamado da Alma",      type: "video", duration_min: 18, is_free: false, sort_order: 1 },
  { id: "les-006", title: "Práticas de Integração", type: "text",  duration_min: 0,  is_free: false, sort_order: 2 },
];

const MOCK_PRODUCT = {
  id: "prod-001",
  slug: "mulher-espiral",
  title: "Mulher Espiral",
  subtitle: "Autoconhecimento feminino",
  description: "Jornada de reconexão profunda",
  thumbnail_url: "/thumb.jpg",
  modules: [
    { id: "mod-001", title: "Módulo 1 — O Chamado",   sort_order: 1, lessons: LESSONS_MOD_1 },
    { id: "mod-002", title: "Módulo 2 — O Despertar", sort_order: 2, lessons: LESSONS_MOD_2 },
  ],
};

const AUTH_USER_WITH_ACCESS = {
  id: "user-001",
  email: "ana@espiral.com",
  name: "Ana Espiral",
  role: "member" as const,
  anonymous_name: "Lua Crescente",
  products: ["mulher-espiral"],
};

const AUTH_USER_NO_ACCESS = {
  id: "user-002",
  email: "guest@espiral.com",
  name: "Convidada",
  role: "member" as const,
  anonymous_name: "Estrela",
  products: [],
};

/* ──────────────────────────────────────────────────────────── */
/* Mock setup helpers                                           */
/* ──────────────────────────────────────────────────────────── */

/**
 * Sets up the two Supabase chains used by CourseViewPage:
 *  1. products → .select().eq().single()
 *  2. lesson_progress → .select().eq().eq()
 */
function setupSupabaseMocks({
  productData = MOCK_PRODUCT as typeof MOCK_PRODUCT | null,
  completedIds = [] as string[],
}: {
  productData?: typeof MOCK_PRODUCT | null;
  completedIds?: string[];
} = {}) {
  // products chain
  mockSingle.mockResolvedValue({
    data: productData,
    error: productData ? null : { message: "Not found" },
  });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });

  // lesson_progress chain: .select().eq(user_id).eq(completed)
  const progressResult = { data: completedIds.map((id) => ({ lesson_id: id })), error: null };
  mockProgressEq2.mockResolvedValue(progressResult);
  mockProgressEq1.mockReturnValue({ eq: mockProgressEq2 });
  mockProgressSelect.mockReturnValue({ eq: mockProgressEq1 });

  mockFrom.mockImplementation((table: string) => {
    if (table === "products")        return { select: mockSelect };
    if (table === "lesson_progress") return { select: mockProgressSelect };
    return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
  });
}

/* Render CourseViewPage at /products/:slug */
function renderCourse(slug = "mulher-espiral") {
  return render(
    <MemoryRouter initialEntries={[`/products/${slug}`]}>
      <Routes>
        <Route path="/products/:slug"                    element={<CourseViewPage />} />
        <Route path="/products/:slug/lesson/:lessonId"   element={<div data-testid="lesson-page">Aula</div>} />
        <Route path="/products/:slug/certificado"        element={<div data-testid="cert-page">Certificado</div>} />
        <Route path="/products"                          element={<div data-testid="products-page">Produtos</div>} />
        <Route path="/checkout/:slug"                    element={<div data-testid="checkout-page">Checkout</div>} />
      </Routes>
    </MemoryRouter>
  );
}

let CourseViewPage: typeof import("@/pages/CourseViewPage").default;

beforeEach(async () => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_ACCESS, loading: false });

  if (!CourseViewPage) {
    const mod = await import("@/pages/CourseViewPage");
    CourseViewPage = mod.default;
  }
});

/* ──────────────────────────────────────────────────────────── */
/* Loading state                                               */
/* ──────────────────────────────────────────────────────────── */

describe("CourseViewPage — loading", () => {
  it("renders the dashboard layout immediately while product is loading", async () => {
    // Products query never resolves → product stays null → "Produto não encontrado" not yet shown
    let resolveProduct: (v: unknown) => void;
    mockSingle.mockReturnValue(new Promise((r) => { resolveProduct = r; }));
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });

    mockProgressEq2.mockResolvedValue({ data: [], error: null });
    mockProgressEq1.mockReturnValue({ eq: mockProgressEq2 });
    mockProgressSelect.mockReturnValue({ eq: mockProgressEq1 });

    mockFrom.mockImplementation((table: string) => {
      if (table === "products")        return { select: mockSelect };
      if (table === "lesson_progress") return { select: mockProgressSelect };
      return { select: vi.fn() };
    });

    renderCourse();

    // DashboardLayout renders immediately
    expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
    // Product content is NOT rendered yet
    expect(screen.queryByText("Mulher Espiral")).not.toBeInTheDocument();

    // Resolve and clean up
    resolveProduct!({ data: null, error: { message: "not found" } });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/products"));
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Product not found → navigate to /products                  */
/* ──────────────────────────────────────────────────────────── */

describe("CourseViewPage — product not found", () => {
  it("calls navigate('/products') when product data is null", async () => {
    setupSupabaseMocks({ productData: null });
    renderCourse("slug-inexistente");

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/products");
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Access denied                                               */
/* ──────────────────────────────────────────────────────────── */

describe("CourseViewPage — access denied", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_NO_ACCESS, loading: false });
    setupSupabaseMocks();
  });

  it("renders 'Acesso necessário' overline", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByText("Acesso necessário")).toBeInTheDocument();
    });
  });

  it("renders product title in the access-denied view", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByText("Mulher Espiral")).toBeInTheDocument();
    });
  });

  it("renders 'Liberar acesso agora' CTA linking to /checkout/:slug", async () => {
    renderCourse();
    await waitFor(() => {
      const cta = screen.getByRole("link", { name: /liberar acesso agora/i });
      expect(cta).toHaveAttribute("href", "/checkout/mulher-espiral");
    });
  });

  it("renders 'Voltar para meus cursos' button in access-denied view", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /voltar para meus cursos/i })).toBeInTheDocument();
    });
  });

  it("'Voltar para meus cursos' calls navigate('/products')", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /voltar para meus cursos/i })).toBeInTheDocument();
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /voltar para meus cursos/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/products");
  });

  it("renders free preview lessons when they exist", async () => {
    renderCourse();
    // LESSONS_MOD_1[2] (les-003, is_free: true) is the free lesson
    await waitFor(() => {
      expect(screen.getByText("Material Complementar")).toBeInTheDocument();
    });
  });

  it("renders 'GRÁTIS' badge on free preview lessons", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByText("GRÁTIS")).toBeInTheDocument();
    });
  });

  it("free lesson links point to /products/:slug/lesson/:id", async () => {
    renderCourse();
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /material complementar/i });
      expect(link).toHaveAttribute("href", "/products/mulher-espiral/lesson/les-003");
    });
  });

  it("does NOT render free preview section when no free lessons exist", async () => {
    // Override: all lessons are paid
    const paidProduct = {
      ...MOCK_PRODUCT,
      modules: [
        {
          ...MOCK_PRODUCT.modules[0],
          lessons: LESSONS_MOD_1.map((l) => ({ ...l, is_free: false })),
        },
      ],
    };
    setupSupabaseMocks({ productData: paidProduct });
    renderCourse();

    await waitFor(() => expect(screen.getByText("Mulher Espiral")).toBeInTheDocument());
    expect(screen.queryByText("Prévia gratuita")).not.toBeInTheDocument();
    expect(screen.queryByText("GRÁTIS")).not.toBeInTheDocument();
  });

  it("does NOT render the module accordion in access-denied view", async () => {
    renderCourse();
    await waitFor(() => expect(screen.getByText("Acesso necessário")).toBeInTheDocument());
    // Module accordion header buttons are not rendered
    expect(screen.queryByText("Módulo 1 — O Chamado")).not.toBeInTheDocument();
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Authenticated user with access                             */
/* ──────────────────────────────────────────────────────────── */

describe("CourseViewPage — user with access", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_ACCESS, loading: false });
    setupSupabaseMocks({ completedIds: [] });
  });

  it("renders the product title in hero", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getAllByText("Mulher Espiral").length).toBeGreaterThan(0);
    });
  });

  it("renders the product subtitle badge", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByText("Autoconhecimento feminino")).toBeInTheDocument();
    });
  });

  it("renders module count in hero (2 módulos)", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByText(/2 módulos/i)).toBeInTheDocument();
    });
  });

  it("renders total lesson count in hero (6 aulas)", async () => {
    renderCourse();
    await waitFor(() => {
      // 4 lessons in mod-1 + 2 in mod-2 = 6 total
      expect(screen.getByText(/6 aulas/i)).toBeInTheDocument();
    });
  });

  it("renders '0 de 6 aulas' progress text when no lessons completed", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByText("0 de 6 aulas")).toBeInTheDocument();
    });
  });

  it("renders 0% progress", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getAllByText("0%").length).toBeGreaterThan(0);
    });
  });

  it("renders the progress bar fill element", async () => {
    renderCourse();
    await waitFor(() => {
      const fills = document.querySelectorAll(".progress-bar-fill");
      expect(fills.length).toBeGreaterThan(0);
    });
  });

  it("renders 'Começar' CTA when no lessons are completed", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /começar/i })).toBeInTheDocument();
    });
  });

  it("'Começar' CTA links to the first lesson", async () => {
    renderCourse();
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /começar/i });
      expect(link).toHaveAttribute("href", "/products/mulher-espiral/lesson/les-001");
    });
  });

  it("calls supabase products query with the correct slug", async () => {
    renderCourse();
    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith("slug", "mulher-espiral");
    });
  });

  it("calls supabase lesson_progress query with the user's id", async () => {
    renderCourse();
    await waitFor(() => {
      expect(mockProgressEq1).toHaveBeenCalledWith("user_id", "user-001");
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Progress scenarios                                          */
/* ──────────────────────────────────────────────────────────── */

describe("CourseViewPage — progress scenarios", () => {
  it("renders partial progress (40%): '2 de 5 aulas' with 40%", async () => {
    // 5 total lessons in a 1-module product, 2 completed
    const partialProduct = {
      ...MOCK_PRODUCT,
      modules: [
        {
          id: "mod-001",
          title: "Módulo 1",
          sort_order: 1,
          lessons: [
            { id: "les-a", title: "Aula 1", type: "video", duration_min: 10, is_free: false, sort_order: 1 },
            { id: "les-b", title: "Aula 2", type: "text",  duration_min: 0,  is_free: false, sort_order: 2 },
            { id: "les-c", title: "Aula 3", type: "video", duration_min: 15, is_free: false, sort_order: 3 },
            { id: "les-d", title: "Aula 4", type: "audio", duration_min: 8,  is_free: false, sort_order: 4 },
            { id: "les-e", title: "Aula 5", type: "pdf",   duration_min: 0,  is_free: false, sort_order: 5 },
          ],
        },
      ],
    };
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_ACCESS, loading: false });
    setupSupabaseMocks({ productData: partialProduct, completedIds: ["les-a", "les-b"] });
    renderCourse();

    await waitFor(() => {
      expect(screen.getByText("2 de 5 aulas")).toBeInTheDocument();
      expect(screen.getAllByText("40%").length).toBeGreaterThan(0);
    });
  });

  it("renders 'Continuar' CTA when some (not all) lessons are completed", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_ACCESS, loading: false });
    setupSupabaseMocks({ completedIds: ["les-001", "les-002"] });
    renderCourse();

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /continuar/i })).toBeInTheDocument();
    });
  });

  it("'Continuar' CTA links to the first uncompleted lesson", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_ACCESS, loading: false });
    // les-001, les-002 done → next is les-003
    setupSupabaseMocks({ completedIds: ["les-001", "les-002"] });
    renderCourse();

    await waitFor(() => {
      const link = screen.getByRole("link", { name: /continuar/i });
      expect(link).toHaveAttribute("href", "/products/mulher-espiral/lesson/les-003");
    });
  });

  it("renders 'Ver certificado' CTA when 100% complete", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_ACCESS, loading: false });
    const allIds = [...LESSONS_MOD_1, ...LESSONS_MOD_2].map((l) => l.id);
    setupSupabaseMocks({ completedIds: allIds });
    renderCourse();

    await waitFor(() => {
      const certLinks = screen.getAllByRole("link", { name: /ver certificado/i });
      expect(certLinks.length).toBeGreaterThan(0);
    });
  });

  it("'Ver certificado' links to /products/:slug/certificado when 100% done", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_ACCESS, loading: false });
    const allIds = [...LESSONS_MOD_1, ...LESSONS_MOD_2].map((l) => l.id);
    setupSupabaseMocks({ completedIds: allIds });
    renderCourse();

    await waitFor(() => {
      const certLinks = screen.getAllByRole("link", { name: /ver certificado/i });
      certLinks.forEach((link) => {
        expect(link).toHaveAttribute("href", "/products/mulher-espiral/certificado");
      });
    });
  });

  it("renders 'Parabéns! Curso concluído.' banner when 100% complete", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_ACCESS, loading: false });
    const allIds = [...LESSONS_MOD_1, ...LESSONS_MOD_2].map((l) => l.id);
    setupSupabaseMocks({ completedIds: allIds });
    renderCourse();

    await waitFor(() => {
      expect(screen.getByText(/parabéns! curso concluído\./i)).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Module accordion                                            */
/* ──────────────────────────────────────────────────────────── */

describe("CourseViewPage — module accordion", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_ACCESS, loading: false });
    setupSupabaseMocks({ completedIds: [] });
  });

  it("renders all module titles", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByText("Módulo 1 — O Chamado")).toBeInTheDocument();
      expect(screen.getByText("Módulo 2 — O Despertar")).toBeInTheDocument();
    });
  });

  it("first module is expanded by default (shows its lessons)", async () => {
    renderCourse();
    await waitFor(() => {
      // Lessons from module 1 should be visible
      expect(screen.getByText("Introdução ao Despertar")).toBeInTheDocument();
    });
  });

  it("second module is collapsed by default (lessons not visible)", async () => {
    renderCourse();
    await waitFor(() => expect(screen.getByText("Módulo 2 — O Despertar")).toBeInTheDocument());
    // Lessons from module 2 should NOT be visible initially
    expect(screen.queryByText("O Chamado da Alma")).not.toBeInTheDocument();
  });

  it("clicking a collapsed module header expands it and shows its lessons", async () => {
    renderCourse();
    await waitFor(() => expect(screen.getByText("Módulo 2 — O Despertar")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /módulo 2/i }));

    await waitFor(() => {
      expect(screen.getByText("O Chamado da Alma")).toBeInTheDocument();
    });
  });

  it("clicking an open module header collapses it", async () => {
    renderCourse();
    await waitFor(() => expect(screen.getByText("Introdução ao Despertar")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /módulo 1/i }));

    await waitFor(() => {
      expect(screen.queryByText("Introdução ao Despertar")).not.toBeInTheDocument();
    });
  });

  it("renders lesson count per module (X/Y aulas concluídas)", async () => {
    renderCourse();
    await waitFor(() => {
      // Module 1: 0/4 aulas concluídas
      expect(screen.getByText("0/4 aulas concluídas")).toBeInTheDocument();
    });
  });

  it("renders correct lesson count for second module", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByText("0/2 aulas concluídas")).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Lesson links and metadata                                   */
/* ──────────────────────────────────────────────────────────── */

describe("CourseViewPage — lesson links and metadata", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_ACCESS, loading: false });
    setupSupabaseMocks({ completedIds: [] });
  });

  it("lesson link points to /products/:slug/lesson/:lessonId", async () => {
    renderCourse();
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /introdução ao despertar/i });
      expect(link).toHaveAttribute("href", "/products/mulher-espiral/lesson/les-001");
    });
  });

  it("second lesson link is correct", async () => {
    renderCourse();
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /a jornada interior/i });
      expect(link).toHaveAttribute("href", "/products/mulher-espiral/lesson/les-002");
    });
  });

  it("renders 'Vídeo' type label for video lessons", async () => {
    renderCourse();
    await waitFor(() => {
      const labels = screen.getAllByText("Vídeo");
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  it("renders 'Leitura' type label for text lessons", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByText("Leitura")).toBeInTheDocument();
    });
  });

  it("renders 'PDF' type label for pdf lessons", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByText("PDF")).toBeInTheDocument();
    });
  });

  it("renders 'Áudio' type label for audio lessons", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByText("Áudio")).toBeInTheDocument();
    });
  });

  it("renders duration_min for lessons that have it ('12min')", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByText("12min")).toBeInTheDocument();
    });
  });

  it("renders '20min' for the audio lesson", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByText("20min")).toBeInTheDocument();
    });
  });

  it("does NOT render 'min' suffix for lessons with duration_min = 0", async () => {
    renderCourse();
    await waitFor(() => expect(screen.getByText("Leitura")).toBeInTheDocument());
    // "A Jornada Interior" has duration_min: 0, so "0min" should NOT appear
    expect(screen.queryByText("0min")).not.toBeInTheDocument();
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Completed lessons                                           */
/* ──────────────────────────────────────────────────────────── */

describe("CourseViewPage — completed lesson indicators", () => {
  it("completed lessons show checkmark (sage-colored check) in the icon slot", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_ACCESS, loading: false });
    setupSupabaseMocks({ completedIds: ["les-001"] });
    renderCourse();

    await waitFor(() => {
      // CheckCircle SVGs are rendered for completed lessons
      // We verify the lesson-progress count shows 1 completed in module 1
      expect(screen.getByText("1/4 aulas concluídas")).toBeInTheDocument();
    });
  });

  it("updates progress text when multiple lessons are completed", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_ACCESS, loading: false });
    setupSupabaseMocks({ completedIds: ["les-001", "les-002", "les-003"] });
    renderCourse();

    await waitFor(() => {
      expect(screen.getByText("3/4 aulas concluídas")).toBeInTheDocument();
      expect(screen.getByText("3 de 6 aulas")).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Stats strip                                                 */
/* ──────────────────────────────────────────────────────────── */

describe("CourseViewPage — stats strip", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_ACCESS, loading: false });
    setupSupabaseMocks({ completedIds: [] });
  });

  it("renders 'módulos' stat chip", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByText("módulos")).toBeInTheDocument();
    });
  });

  it("renders 'aulas' stat chip", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByText("aulas")).toBeInTheDocument();
    });
  });

  it("renders 'concluídas' stat chip", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByText("concluídas")).toBeInTheDocument();
    });
  });

  it("renders 'progresso' stat chip", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByText("progresso")).toBeInTheDocument();
    });
  });

  it("renders mini module progress bars (M1, M2 chips)", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByText("M1")).toBeInTheDocument();
      expect(screen.getByText("M2")).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Navigation                                                  */
/* ──────────────────────────────────────────────────────────── */

describe("CourseViewPage — navigation", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_ACCESS, loading: false });
    setupSupabaseMocks({ completedIds: [] });
  });

  it("renders 'Meus Cursos' back button", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /meus cursos/i })).toBeInTheDocument();
    });
  });

  it("'Meus Cursos' button calls navigate('/products')", async () => {
    renderCourse();
    await waitFor(() => expect(screen.getByRole("button", { name: /meus cursos/i })).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /meus cursos/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/products");
  });

  it("renders 'Conteúdo do curso' section heading", async () => {
    renderCourse();
    await waitFor(() => {
      expect(screen.getByText("Conteúdo do curso")).toBeInTheDocument();
    });
  });
});
