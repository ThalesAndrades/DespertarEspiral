/**
 * Integration Tests — ProductsPage
 *
 * Covers:
 *  - Loading skeletons (.skeleton divs) while data fetches
 *  - Empty state: 'Nenhum curso disponível' when products array is empty
 *  - Empty state: '← Voltar ao dashboard' link
 *  - Rendered product card: title, thumbnail, modules/aulas metadata
 *  - Progress bar and "X/Y · Z%" for user WITH access
 *  - CTA "Começar" when 0% progress (has access)
 *  - CTA "Continuar" when progress > 0 (has access)
 *  - CTA "Concluído" badge when 100% (has access)
 *  - Link to /products/:slug for course with access
 *  - No-access product: price in BRL, "Adquirir" CTA → /checkout/:slug
 *  - No-access product: lock overlay badge "SEM ACESSO"
 *  - Multiple products rendered: first with access, second without
 *  - Supabase queries called with correct user_id
 *  - Page title in Helmet
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/* ── Static asset mocks ── */
vi.mock("@/assets/mulher-espiral-cover.svg", () => ({ default: "/mock-cover.svg" }));
vi.mock("@/assets/mulher-espiral-hero-new.jpg", () => ({ default: "/mock-hero.jpg" }));

/* ── react-helmet-async ── */
vi.mock("react-helmet-async", () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  HelmetProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

/* ── DashboardLayout ── */
vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

/* ── MulherEspiralMark ── */
vi.mock("@/components/layout/MulherEspiralMark", () => ({
  default: () => <div data-testid="mulher-espiral-mark" />,
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

const AUTH_USER = {
  id: "user-001",
  email: "ana@espiral.com",
  name: "Ana Espiral",
  role: "member" as const,
  anonymous_name: "Lua Crescente",
  products: ["mulher-espiral"],
};

/** Products returned by supabase.from("products").select(...) */
const MOCK_PRODUCTS_RAW = [
  {
    id: "prod-001",
    slug: "mulher-espiral",
    title: "Mulher Espiral",
    subtitle: "Autoconhecimento feminino",
    description: "Jornada de reconexão",
    price: 997.00,
    original_price: 1997.00,
    thumbnail_url: "/thumb-mulher.jpg",
    modules: [
      { id: "mod-1", lessons: [{ id: "les-1" }, { id: "les-2" }, { id: "les-3" }] },
      { id: "mod-2", lessons: [{ id: "les-4" }, { id: "les-5" }] },
    ],
  },
  {
    id: "prod-002",
    slug: "inner-fire",
    title: "Inner Fire",
    subtitle: "Energia e movimento",
    description: "Prática diária",
    price: 497.00,
    original_price: null,
    thumbnail_url: "/thumb-inner.jpg",
    modules: [
      { id: "mod-3", lessons: [{ id: "les-6" }, { id: "les-7" }, { id: "les-8" }] },
    ],
  },
];

/** Owned row — user has mulher-espiral */
const OWNED_MULHER_ESPIRAL = [{ product_id: "prod-001" }];

/** Completed lesson IDs */
const COMPLETED_LES_1_AND_2 = ["les-1", "les-2"]; // 2 of 5 = 40%
const ALL_LES_MULHER        = ["les-1", "les-2", "les-3", "les-4", "les-5"]; // 100%

/* ──────────────────────────────────────────────────────────── */
/* Supabase mock setup helper                                   */
/* ──────────────────────────────────────────────────────────── */

function setupSupabaseMocks({
  products     = MOCK_PRODUCTS_RAW,
  ownedRows    = OWNED_MULHER_ESPIRAL,
  completedIds = COMPLETED_LES_1_AND_2,
}: {
  products?:     typeof MOCK_PRODUCTS_RAW;
  ownedRows?:    { product_id: string }[];
  completedIds?: string[];
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    /* products: .select().eq("is_active").order() */
    if (table === "products") {
      const order  = vi.fn().mockResolvedValue({ data: products, error: null });
      const eqAct  = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq: eqAct });
      return { select };
    }

    /* user_products: .select().eq("user_id") */
    if (table === "user_products") {
      const eq     = vi.fn().mockResolvedValue({ data: ownedRows, error: null });
      const select = vi.fn().mockReturnValue({ eq });
      return { select };
    }

    /* lesson_progress: .select().eq().eq().in() */
    if (table === "lesson_progress") {
      const inFn   = vi.fn().mockResolvedValue({
        data: completedIds.map((id) => ({ lesson_id: id })),
        error: null,
      });
      const eq2    = vi.fn().mockReturnValue({ in: inFn });
      const eq1    = vi.fn().mockReturnValue({ eq: eq2 });
      const select = vi.fn().mockReturnValue({ eq: eq1 });
      return { select };
    }

    return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
  });
}

/* Render ProductsPage */
function renderProducts() {
  return render(
    <MemoryRouter initialEntries={["/products"]}>
      <Routes>
        <Route path="/products"           element={<ProductsPage />} />
        <Route path="/products/:slug"     element={<div data-testid="course-page">Curso</div>} />
        <Route path="/checkout/:slug"     element={<div data-testid="checkout-page">Checkout</div>} />
        <Route path="/dashboard"          element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

let ProductsPage: typeof import("@/pages/ProductsPage").default;

beforeEach(async () => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: AUTH_USER, loading: false });

  if (!ProductsPage) {
    const mod = await import("@/pages/ProductsPage");
    ProductsPage = mod.default;
  }
});

/* ──────────────────────────────────────────────────────────── */
/* Loading state                                               */
/* ──────────────────────────────────────────────────────────── */

describe("ProductsPage — loading skeleton", () => {
  it("renders skeleton cards while data is loading", () => {
    // Never resolves → stays in loading state
    let resolve: (v: unknown) => void;
    const pending = new Promise((r) => { resolve = r; });

    mockFrom.mockImplementation((table: string) => {
      if (table === "products") {
        const order  = vi.fn().mockReturnValue(pending);
        const eqAct  = vi.fn().mockReturnValue({ order });
        const select = vi.fn().mockReturnValue({ eq: eqAct });
        return { select };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderProducts();

    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);

    // Product content not rendered yet
    expect(screen.queryByText("Mulher Espiral")).not.toBeInTheDocument();

    resolve!({ data: [], error: null });
  });

  it("renders 2 skeleton cards while loading", () => {
    let resolve: (v: unknown) => void;
    const pending = new Promise((r) => { resolve = r; });

    mockFrom.mockImplementation((table: string) => {
      if (table === "products") {
        const order  = vi.fn().mockReturnValue(pending);
        const eqAct  = vi.fn().mockReturnValue({ order });
        const select = vi.fn().mockReturnValue({ eq: eqAct });
        return { select };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderProducts();

    // ProductsSkeletonList renders 2 ProductCardSkeleton components
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThanOrEqual(2);

    resolve!({ data: [], error: null });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Empty state                                                 */
/* ──────────────────────────────────────────────────────────── */

describe("ProductsPage — empty state", () => {
  it("renders 'Nenhum curso disponível' when products is empty", async () => {
    setupSupabaseMocks({ products: [], ownedRows: [], completedIds: [] });
    renderProducts();

    await waitFor(() => {
      expect(screen.getByText("Nenhum curso disponível")).toBeInTheDocument();
    });
  });

  it("renders the empty state description text", async () => {
    setupSupabaseMocks({ products: [], ownedRows: [], completedIds: [] });
    renderProducts();

    await waitFor(() => {
      expect(screen.getByText(/em breve novas jornadas/i)).toBeInTheDocument();
    });
  });

  it("renders '← Voltar ao dashboard' link in empty state", async () => {
    setupSupabaseMocks({ products: [], ownedRows: [], completedIds: [] });
    renderProducts();

    await waitFor(() => {
      const link = screen.getByRole("link", { name: /voltar ao dashboard/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/dashboard");
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Product card — user WITH access                            */
/* ──────────────────────────────────────────────────────────── */

describe("ProductsPage — product card with access", () => {
  beforeEach(() => {
    setupSupabaseMocks({
      ownedRows: OWNED_MULHER_ESPIRAL,
      completedIds: COMPLETED_LES_1_AND_2,
    });
  });

  it("renders the product title", async () => {
    renderProducts();
    await waitFor(() => {
      expect(screen.getAllByText("Mulher Espiral").length).toBeGreaterThan(0);
    });
  });

  it("renders the product thumbnail image", async () => {
    renderProducts();
    await waitFor(() => {
      const img = screen.getByAltText("Mulher Espiral");
      expect(img).toBeInTheDocument();
    });
  });

  it("renders module count in overlay ('2 módulos')", async () => {
    renderProducts();
    await waitFor(() => {
      expect(screen.getByText(/2 módulos/i)).toBeInTheDocument();
    });
  });

  it("renders lesson count in overlay ('5 aulas')", async () => {
    renderProducts();
    await waitFor(() => {
      expect(screen.getByText(/5 aulas/i)).toBeInTheDocument();
    });
  });

  it("renders 'Progresso' label for product with access", async () => {
    renderProducts();
    await waitFor(() => {
      expect(screen.getByText("Progresso")).toBeInTheDocument();
    });
  });

  it("renders progress as 'X/Y · Z%' (2/5 · 40%)", async () => {
    renderProducts();
    await waitFor(() => {
      expect(screen.getByText("2/5 · 40%")).toBeInTheDocument();
    });
  });

  it("renders the progress bar fill element", async () => {
    renderProducts();
    await waitFor(() => {
      const fills = document.querySelectorAll(".progress-bar-fill");
      expect(fills.length).toBeGreaterThan(0);
    });
  });

  it("renders 'Continuar' CTA when progress > 0%", async () => {
    renderProducts();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /continuar/i })).toBeInTheDocument();
    });
  });

  it("'Continuar' CTA links to /products/:slug", async () => {
    renderProducts();
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /continuar/i });
      expect(link).toHaveAttribute("href", "/products/mulher-espiral");
    });
  });

  it("renders 'Começar' CTA when progress is 0%", async () => {
    setupSupabaseMocks({ ownedRows: OWNED_MULHER_ESPIRAL, completedIds: [] });
    renderProducts();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /começar/i })).toBeInTheDocument();
    });
  });

  it("'Começar' CTA links to /products/:slug", async () => {
    setupSupabaseMocks({ ownedRows: OWNED_MULHER_ESPIRAL, completedIds: [] });
    renderProducts();
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /começar/i });
      expect(link).toHaveAttribute("href", "/products/mulher-espiral");
    });
  });

  it("renders 'Concluído' badge when progress is 100%", async () => {
    setupSupabaseMocks({ ownedRows: OWNED_MULHER_ESPIRAL, completedIds: ALL_LES_MULHER });
    renderProducts();
    await waitFor(() => {
      expect(screen.getByText("Concluído")).toBeInTheDocument();
    });
  });

  it("renders '5/5 · 100%' progress when all lessons complete", async () => {
    setupSupabaseMocks({ ownedRows: OWNED_MULHER_ESPIRAL, completedIds: ALL_LES_MULHER });
    renderProducts();
    await waitFor(() => {
      expect(screen.getByText("5/5 · 100%")).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Product card — user WITHOUT access                         */
/* ──────────────────────────────────────────────────────────── */

describe("ProductsPage — product card without access", () => {
  beforeEach(() => {
    // User only owns mulher-espiral; inner-fire is locked
    setupSupabaseMocks({
      ownedRows: OWNED_MULHER_ESPIRAL,
      completedIds: [],
    });
  });

  it("renders locked product title (Inner Fire)", async () => {
    renderProducts();
    await waitFor(() => {
      expect(screen.getByText("Inner Fire")).toBeInTheDocument();
    });
  });

  it("renders price in BRL for locked product", async () => {
    renderProducts();
    await waitFor(() => {
      expect(screen.getByText(/R\$.*497/)).toBeInTheDocument();
    });
  });

  it("renders 'Adquirir' CTA for locked product", async () => {
    renderProducts();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /adquirir/i })).toBeInTheDocument();
    });
  });

  it("'Adquirir' CTA links to /checkout/:slug", async () => {
    renderProducts();
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /adquirir/i });
      expect(link).toHaveAttribute("href", "/checkout/inner-fire");
    });
  });

  it("renders 'Sem acesso' lock overlay for locked product", async () => {
    renderProducts();
    await waitFor(() => {
      expect(screen.getByText(/sem acesso/i)).toBeInTheDocument();
    });
  });

  it("does NOT render progress bar for locked product", async () => {
    renderProducts();
    await waitFor(() => {
      // Locked products show price, not progress
      expect(screen.queryByText("Progresso")).not.toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Multiple products                                           */
/* ──────────────────────────────────────────────────────────── */

describe("ProductsPage — multiple products rendered", () => {
  it("renders both products when multiple are returned", async () => {
    setupSupabaseMocks({ ownedRows: OWNED_MULHER_ESPIRAL, completedIds: [] });
    renderProducts();
    await waitFor(() => {
      expect(screen.getByText("Mulher Espiral")).toBeInTheDocument();
      expect(screen.getByText("Inner Fire")).toBeInTheDocument();
    });
  });

  it("renders Começar for mulher-espiral (has access, 0%) and Adquirir for inner-fire (no access)", async () => {
    setupSupabaseMocks({ ownedRows: OWNED_MULHER_ESPIRAL, completedIds: [] });
    renderProducts();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /começar/i })).toHaveAttribute("href", "/products/mulher-espiral");
      expect(screen.getByRole("link", { name: /adquirir/i })).toHaveAttribute("href", "/checkout/inner-fire");
    });
  });

  it("renders thumbnail image for each product", async () => {
    setupSupabaseMocks({ ownedRows: OWNED_MULHER_ESPIRAL, completedIds: [] });
    renderProducts();
    await waitFor(() => {
      expect(screen.getByAltText("Mulher Espiral")).toBeInTheDocument();
      expect(screen.getByAltText("Inner Fire")).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Supabase queries                                            */
/* ──────────────────────────────────────────────────────────── */

describe("ProductsPage — Supabase queries", () => {
  it("queries user_products with the authenticated user id", async () => {
    const eqSpy = vi.fn().mockResolvedValue({ data: OWNED_MULHER_ESPIRAL, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_products") {
        const select = vi.fn().mockReturnValue({ eq: eqSpy });
        return { select };
      }
      if (table === "products") {
        const order  = vi.fn().mockResolvedValue({ data: MOCK_PRODUCTS_RAW, error: null });
        const eqAct  = vi.fn().mockReturnValue({ order });
        const select = vi.fn().mockReturnValue({ eq: eqAct });
        return { select };
      }
      if (table === "lesson_progress") {
        const inFn   = vi.fn().mockResolvedValue({ data: [], error: null });
        const eq2    = vi.fn().mockReturnValue({ in: inFn });
        const eq1    = vi.fn().mockReturnValue({ eq: eq2 });
        const select = vi.fn().mockReturnValue({ eq: eq1 });
        return { select };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderProducts();
    await waitFor(() => {
      expect(eqSpy).toHaveBeenCalledWith("user_id", "user-001");
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Page header & meta                                         */
/* ──────────────────────────────────────────────────────────── */

describe("ProductsPage — header and meta", () => {
  it("renders 'Meus Cursos' page heading", async () => {
    setupSupabaseMocks();
    renderProducts();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /meus cursos/i })).toBeInTheDocument();
    });
  });

  it("renders 'Biblioteca' overline label", async () => {
    setupSupabaseMocks();
    renderProducts();
    await waitFor(() => {
      expect(screen.getByText("Biblioteca")).toBeInTheDocument();
    });
  });

  it("renders the page title via Helmet (Meus Cursos)", async () => {
    setupSupabaseMocks();
    renderProducts();
    await waitFor(() => {
      expect(document.title).toContain("Meus Cursos");
    });
  });
});
