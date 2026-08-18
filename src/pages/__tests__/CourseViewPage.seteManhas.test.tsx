/**
 * Integration Tests — CourseViewPage × Sete Manhãs
 *
 * Covers the 4 obrigatory cases from the Task 3 brief:
 *  - Anel (AnelSeteManhas) renders when product.slug === SETE_MANHAS_SLUG
 *  - Manhã 2 is "disponível hoje" when manhã 1 was completed yesterday
 *  - Manhãs 3..7 render as "ainda bloqueada"
 *  - No other product renders the ring
 *
 * Mock pattern copied from the sibling CourseViewPage.test.tsx (not imported —
 * test files don't export their helpers).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
const mockFrom = vi.fn();
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

const SETE_MANHAS_LESSONS = Array.from({ length: 7 }, (_, i) => ({
  id: `sm-lesson-${i + 1}`,
  title: `Manhã ${i + 1}`,
  type: "audio",
  duration_min: 8,
  is_free: false,
  sort_order: i + 1,
}));

const PRODUCT_SETE_MANHAS = {
  id: "prod-sete-manhas",
  slug: "sete-manhas",
  title: "Sete Manhãs",
  subtitle: "Uma manhã por dia",
  description: "Jornada de sete dias",
  thumbnail_url: "/thumb-sm.jpg",
  modules: [
    { id: "mod-sete-manhas", title: "Sete Manhãs", sort_order: 1, lessons: SETE_MANHAS_LESSONS },
  ],
};

const PRODUCT_OUTRO = {
  id: "prod-outro",
  slug: "mulher-espiral",
  title: "Mulher Espiral",
  subtitle: "Autoconhecimento feminino",
  description: "Jornada de reconexão profunda",
  thumbnail_url: "/thumb.jpg",
  modules: [
    {
      id: "mod-outro",
      title: "Módulo 1",
      sort_order: 1,
      lessons: [
        { id: "les-outro-1", title: "Aula 1", type: "video", duration_min: 10, is_free: false, sort_order: 1 },
      ],
    },
  ],
};

const AUTH_USER_SETE_MANHAS = {
  id: "user-sm-001",
  email: "aluna@espiral.com",
  name: "Aluna Espiral",
  role: "member" as const,
  anonymous_name: "Lua Nova",
  products: ["sete-manhas"],
};

const AUTH_USER_OUTRO_PRODUTO = {
  id: "user-outro-001",
  email: "outra@espiral.com",
  name: "Outra Aluna",
  role: "member" as const,
  anonymous_name: "Estrela Guia",
  products: ["mulher-espiral"],
};

/** ISO timestamp for "ontem" (24h before now) — always the previous SP calendar day. */
function ontemISO(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

/* ──────────────────────────────────────────────────────────── */
/* Mock setup helper                                             */
/* ──────────────────────────────────────────────────────────── */

function setupSupabaseMocks({
  productData,
  progressRows = [] as { lesson_id: string; completed_at: string }[],
}: {
  productData: Record<string, unknown> | null;
  progressRows?: { lesson_id: string; completed_at: string }[];
}) {
  const single = vi.fn().mockResolvedValue({
    data: productData,
    error: productData ? null : { message: "Not found" },
  });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });

  const progressEq2 = vi.fn().mockResolvedValue({ data: progressRows, error: null });
  const progressEq1 = vi.fn().mockReturnValue({ eq: progressEq2 });
  const progressSelect = vi.fn().mockReturnValue({ eq: progressEq1 });

  mockFrom.mockImplementation((table: string) => {
    if (table === "products") return { select };
    if (table === "lesson_progress") return { select: progressSelect };
    return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
  });
}

/* Render CourseViewPage at /products/:slug */
function renderCourse(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/products/${slug}`]}>
      <Routes>
        <Route path="/products/:slug"                  element={<CourseViewPage />} />
        <Route path="/products/:slug/lesson/:lessonId"  element={<div data-testid="lesson-page">Aula</div>} />
        <Route path="/products/:slug/certificado"       element={<div data-testid="cert-page">Certificado</div>} />
        <Route path="/products"                         element={<div data-testid="products-page">Produtos</div>} />
        <Route path="/checkout/:slug"                   element={<div data-testid="checkout-page">Checkout</div>} />
      </Routes>
    </MemoryRouter>
  );
}

let CourseViewPage: typeof import("@/pages/CourseViewPage").default;

beforeEach(async () => {
  vi.clearAllMocks();

  if (!CourseViewPage) {
    const mod = await import("@/pages/CourseViewPage");
    CourseViewPage = mod.default;
  }
});

/* ──────────────────────────────────────────────────────────── */

describe("CourseViewPage — Sete Manhas", () => {
  it("renderiza o anel quando o produto e sete-manhas", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_SETE_MANHAS, loading: false });
    setupSupabaseMocks({
      productData: PRODUCT_SETE_MANHAS,
      progressRows: [{ lesson_id: "sm-lesson-1", completed_at: ontemISO() }],
    });

    renderCourse("sete-manhas");

    await waitFor(() => {
      expect(screen.getByText(/Sua jornada/)).toBeInTheDocument();
    });
  });

  it("aula 2 aparece disponivel quando a 1 foi concluida ontem", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_SETE_MANHAS, loading: false });
    setupSupabaseMocks({
      productData: PRODUCT_SETE_MANHAS,
      progressRows: [{ lesson_id: "sm-lesson-1", completed_at: ontemISO() }],
    });

    renderCourse("sete-manhas");

    await waitFor(() => {
      expect(screen.getByLabelText("Manhã 2: disponível hoje")).toBeInTheDocument();
    });
  });

  it("aulas 3..7 aparecem bloqueadas", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_SETE_MANHAS, loading: false });
    setupSupabaseMocks({
      productData: PRODUCT_SETE_MANHAS,
      progressRows: [{ lesson_id: "sm-lesson-1", completed_at: ontemISO() }],
    });

    renderCourse("sete-manhas");

    await waitFor(() => {
      for (let indice = 3; indice <= 7; indice++) {
        // O rótulo aparece tanto no anel (li) quanto no item bloqueado da lista de aulas.
        expect(screen.getAllByLabelText(`Manhã ${indice}: ainda bloqueada`).length).toBeGreaterThan(0);
      }
    });
  });

  it("produto que NAO e sete-manhas nao renderiza anel", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_OUTRO_PRODUTO, loading: false });
    setupSupabaseMocks({ productData: PRODUCT_OUTRO, progressRows: [] });

    renderCourse("mulher-espiral");

    await waitFor(() => {
      expect(screen.getAllByText("Mulher Espiral").length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/Sua jornada/)).not.toBeInTheDocument();
  });
});
