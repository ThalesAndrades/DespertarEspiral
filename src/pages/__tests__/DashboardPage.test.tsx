/**
 * Integration Tests — DashboardPage
 *
 * Covers:
 *  - Rendering with authenticated user (name, anonymous_name, avatar initial)
 *  - Skeleton screens during product loading (loadingP = true)
 *  - Skeleton screens during community loading (loadingC = true)
 *  - User WITH products: course card (title, progress bar, progress %, lesson count)
 *  - User WITH products: overall progress bar + stats (aulas concluídas, total, cursos)
 *  - User WITH products: community posts list (title, anonymous_name, likes, comments)
 *  - User WITHOUT products: "Inicie sua jornada" empty state rendered
 *  - User WITHOUT products: upsell section with CTA "Quero começar minha jornada"
 *  - User WITHOUT products: link to /checkout/mulher-espiral in CTA
 *  - Community empty state when posts array is empty
 *  - Multiple products: compact row cards for products[1..n]
 *  - Greeting uses user's first name
 *  - Supabase queries called with correct user_id
 *  - Navigation links: "Ver todos" → /products, "Ver tudo" → /community
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/* ── Static asset mocks ── */
vi.mock("@/assets/mulher-espiral-hero-new.jpg", () => ({ default: "/mock-hero.jpg" }));

/* ── react-helmet-async ── */
vi.mock("react-helmet-async", () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  HelmetProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

/* ── DashboardLayout: render children directly ── */
vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

/* ── SpiralLogo ── */
vi.mock("@/components/layout/SpiralLogo", () => ({
  default: () => <div data-testid="spiral-logo" />,
}));

/* ── dateUtils — deterministic output ── */
vi.mock("@/lib/dateUtils", () => ({
  timeAgo:     (date: string) => `${date}-ago`,
  greeting:    () => "Bom dia",
  progressPct: (done: number, total: number) =>
    total > 0 ? Math.round((done / total) * 100) : 0,
  formatBRL:   (n: number) => `R$ ${n}`,
}));

/* ── useAuth ── */
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

/* ── Supabase ── */
const mockUserProductsSelect = vi.fn();
const mockUserProductsEq    = vi.fn();

const mockLessonProgressSelect = vi.fn();
const mockLessonProgressEq1    = vi.fn();
const mockLessonProgressEq2    = vi.fn();
const mockLessonProgressIn     = vi.fn();

const mockCommunityPostsSelect = vi.fn();
const mockCommunityPostsEq     = vi.fn();
const mockCommunityPostsOrder  = vi.fn();
const mockCommunityPostsLimit  = vi.fn();

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

/* ──────────────────────────────────────────────────────────── */
/* Test data                                                    */
/* ──────────────────────────────────────────────────────────── */

const AUTH_USER_WITH_PRODUCTS = {
  id: "user-001",
  email: "ana@espiral.com",
  name: "Ana Espiral",
  role: "member" as const,
  anonymous_name: "Lua Crescente",
  products: ["mulher-espiral"],
};

const AUTH_USER_NO_PRODUCTS = {
  id: "user-002",
  email: "guest@espiral.com",
  name: "Convidada Silva",
  role: "member" as const,
  anonymous_name: "Estrela Dourada",
  products: [],
};

/** A single product returned by user_products with nested modules/lessons */
const MOCK_OWNED_PRODUCT = {
  product_id: "prod-001",
  products: {
    id: "prod-001",
    slug: "mulher-espiral",
    title: "Mulher Espiral",
    subtitle: "Autoconhecimento feminino",
    thumbnail_url: "/thumb.jpg",
    modules: [
      { id: "mod-1", lessons: [{ id: "les-1" }, { id: "les-2" }, { id: "les-3" }] },
      { id: "mod-2", lessons: [{ id: "les-4" }, { id: "les-5" }] },
    ],
  },
};

/** A second product for multi-product tests */
const MOCK_OWNED_PRODUCT_2 = {
  product_id: "prod-002",
  products: {
    id: "prod-002",
    slug: "inner-fire",
    title: "Inner Fire",
    subtitle: "Energia e movimento",
    thumbnail_url: "/thumb2.jpg",
    modules: [
      { id: "mod-3", lessons: [{ id: "les-6" }, { id: "les-7" }] },
    ],
  },
};

const MOCK_COMMUNITY_POSTS = [
  {
    id: "post-001",
    title: "Minha primeira semana na espiral",
    category: "conquistas",
    likes_count: 12,
    comments_count: 3,
    is_pinned: false,
    created_at: "2026-04-20T10:00:00Z",
    user_profiles: { anonymous_name: "Flor do Cerrado" },
  },
  {
    id: "post-002",
    title: "Dúvida sobre o módulo 3",
    category: "duvidas",
    likes_count: 4,
    comments_count: 7,
    is_pinned: false,
    created_at: "2026-04-19T08:30:00Z",
    user_profiles: { anonymous_name: "Maré Alta" },
  },
];

/* ──────────────────────────────────────────────────────────── */
/* Setup helpers                                               */
/* ──────────────────────────────────────────────────────────── */

/**
 * Wire up mockFrom for a given scenario.
 *
 * user_products → returns `ownedRows`
 * lesson_progress → returns `completedLessonIds` as { lesson_id } array
 * community_posts → returns `posts`
 */
function setupSupabaseMocks({
  ownedRows = [MOCK_OWNED_PRODUCT],
  completedLessonIds = ["les-1", "les-2"],
  posts = MOCK_COMMUNITY_POSTS,
}: {
  ownedRows?: typeof MOCK_OWNED_PRODUCT[];
  completedLessonIds?: string[];
  posts?: typeof MOCK_COMMUNITY_POSTS;
} = {}) {
  // lesson_progress chain: .select().eq().eq().in()
  mockLessonProgressIn.mockResolvedValue({
    data: completedLessonIds.map((id) => ({ lesson_id: id })),
    error: null,
  });
  mockLessonProgressEq2.mockReturnValue({ in: mockLessonProgressIn });
  mockLessonProgressEq1.mockReturnValue({ eq: mockLessonProgressEq2 });
  mockLessonProgressSelect.mockReturnValue({ eq: mockLessonProgressEq1 });

  // community_posts chain: .select().eq().order().limit()
  mockCommunityPostsLimit.mockResolvedValue({ data: posts, error: null });
  mockCommunityPostsOrder.mockReturnValue({ limit: mockCommunityPostsLimit });
  mockCommunityPostsEq.mockReturnValue({ order: mockCommunityPostsOrder });
  mockCommunityPostsSelect.mockReturnValue({ eq: mockCommunityPostsEq });

  // user_products chain: .select().eq()
  mockUserProductsEq.mockResolvedValue({ data: ownedRows, error: null });
  mockUserProductsSelect.mockReturnValue({ eq: mockUserProductsEq });

  mockFrom.mockImplementation((table: string) => {
    if (table === "user_products")    return { select: mockUserProductsSelect };
    if (table === "lesson_progress")  return { select: mockLessonProgressSelect };
    if (table === "community_posts")  return { select: mockCommunityPostsSelect };
    return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
  });
}

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products"  element={<div data-testid="products-page">Produtos</div>} />
        <Route path="/community" element={<div data-testid="community-page">Comunidade</div>} />
        <Route path="/checkout/mulher-espiral" element={<div data-testid="checkout-page">Checkout</div>} />
      </Routes>
    </MemoryRouter>
  );
}

let DashboardPage: typeof import("@/pages/DashboardPage").default;

beforeEach(async () => {
  vi.clearAllMocks();
  if (!DashboardPage) {
    const mod = await import("@/pages/DashboardPage");
    DashboardPage = mod.default;
  }
});

/* ──────────────────────────────────────────────────────────── */
/* Basic rendering                                             */
/* ──────────────────────────────────────────────────────────── */

describe("DashboardPage — greeting & user info", () => {
  it("renders greeting with user's first name", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_PRODUCTS, loading: false });
    setupSupabaseMocks();
    renderDashboard();

    await waitFor(() => {
      // greeting() returns "Bom dia" and name split is "Ana"
      expect(screen.getByText(/bom dia.*ana/i)).toBeInTheDocument();
    });
  });

  it("renders 'Bem-vinda de volta.' headline", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_PRODUCTS, loading: false });
    setupSupabaseMocks();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Bem-vinda de volta.")).toBeInTheDocument();
    });
  });

  it("renders anonymous_name badge", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_PRODUCTS, loading: false });
    setupSupabaseMocks();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Lua Crescente")).toBeInTheDocument();
    });
  });

  it("renders avatar with first letter of user name", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_PRODUCTS, loading: false });
    setupSupabaseMocks();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("A")).toBeInTheDocument(); // "Ana" → "A"
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Skeleton screens                                            */
/* ──────────────────────────────────────────────────────────── */

describe("DashboardPage — skeleton during product loading", () => {
  it("renders skeleton when product data is still loading", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_PRODUCTS, loading: false });

    // user_products never resolves → loadingP stays true
    let resolveProducts: (v: unknown) => void;
    const pendingProducts = new Promise((r) => { resolveProducts = r; });
    mockUserProductsEq.mockReturnValue(pendingProducts);
    mockUserProductsSelect.mockReturnValue({ eq: mockUserProductsEq });

    // community_posts resolves normally
    mockCommunityPostsLimit.mockResolvedValue({ data: [], error: null });
    mockCommunityPostsOrder.mockReturnValue({ limit: mockCommunityPostsLimit });
    mockCommunityPostsEq.mockReturnValue({ order: mockCommunityPostsOrder });
    mockCommunityPostsSelect.mockReturnValue({ eq: mockCommunityPostsEq });

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_products")   return { select: mockUserProductsSelect };
      if (table === "community_posts") return { select: mockCommunityPostsSelect };
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderDashboard();

    // While loading, the course card shouldn't be present but skeleton should be
    expect(screen.queryByRole("link", { name: /mulher espiral/i })).not.toBeInTheDocument();

    // Skeletons are rendered as divs with className "skeleton"
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);

    // Resolve to unblock cleanup
    resolveProducts!({ data: [], error: null });
  });

  it("renders community skeleton when community data is loading", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_PRODUCTS, loading: false });

    // user_products resolves immediately (empty)
    mockUserProductsEq.mockResolvedValue({ data: [], error: null });
    mockUserProductsSelect.mockReturnValue({ eq: mockUserProductsEq });

    // community_posts never resolves → loadingC stays true
    let resolvePosts: (v: unknown) => void;
    const pendingPosts = new Promise((r) => { resolvePosts = r; });
    mockCommunityPostsLimit.mockReturnValue(pendingPosts);
    mockCommunityPostsOrder.mockReturnValue({ limit: mockCommunityPostsLimit });
    mockCommunityPostsEq.mockReturnValue({ order: mockCommunityPostsOrder });
    mockCommunityPostsSelect.mockReturnValue({ eq: mockCommunityPostsEq });

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_products")   return { select: mockUserProductsSelect };
      if (table === "community_posts") return { select: mockCommunityPostsSelect };
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderDashboard();

    // Community posts not yet visible; skeleton divs present
    expect(screen.queryByText("Minha primeira semana na espiral")).not.toBeInTheDocument();
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);

    resolvePosts!({ data: [], error: null });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* User WITH products                                          */
/* ──────────────────────────────────────────────────────────── */

describe("DashboardPage — user with products", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_PRODUCTS, loading: false });
    setupSupabaseMocks({
      ownedRows: [MOCK_OWNED_PRODUCT],
      completedLessonIds: ["les-1", "les-2"],  // 2 of 5 lessons completed
      posts: MOCK_COMMUNITY_POSTS,
    });
  });

  it("renders the main product course card with its title", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getAllByText("Mulher Espiral").length).toBeGreaterThan(0);
    });
  });

  it("renders the product thumbnail image", async () => {
    renderDashboard();
    await waitFor(() => {
      const img = screen.getByAltText("Mulher Espiral");
      expect(img).toBeInTheDocument();
    });
  });

  it("renders lesson count (X de Y aulas)", async () => {
    renderDashboard();
    // 2 completed out of 5 total
    await waitFor(() => {
      expect(screen.getByText(/2 de 5 aulas/i)).toBeInTheDocument();
    });
  });

  it("renders progress percentage (40%)", async () => {
    renderDashboard();
    // 2/5 = 40%
    await waitFor(() => {
      expect(screen.getByText("40%")).toBeInTheDocument();
    });
  });

  it("renders the progress bar fill element", async () => {
    renderDashboard();
    await waitFor(() => {
      const fills = document.querySelectorAll(".progress-bar-fill");
      expect(fills.length).toBeGreaterThan(0);
    });
  });

  it("renders overall stats: aulas concluídas, total, cursos count", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText("concluídas")).toBeInTheDocument();
      expect(screen.getByText("no total")).toBeInTheDocument();
      expect(screen.getByText("cursos")).toBeInTheDocument();
    });
  });

  it("renders the overall progress percentage in the hero bar", async () => {
    renderDashboard();
    // 2 done / 5 total = 40%
    await waitFor(() => {
      // There should be at least one element showing "40%"
      const fortyPct = screen.getAllByText("40%");
      expect(fortyPct.length).toBeGreaterThan(0);
    });
  });

  it("course card is a link to /products/:slug", async () => {
    renderDashboard();
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /mulher espiral/i });
      expect(link).toHaveAttribute("href", "/products/mulher-espiral");
    });
  });

  it("does NOT render the 'Inicie sua jornada' empty state", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(loadingP_done()).toBe(true);
    });
    expect(screen.queryByText("Inicie sua jornada")).not.toBeInTheDocument();
  });

  it("does NOT render the upsell CTA section", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(loadingP_done()).toBe(true);
    });
    expect(screen.queryByText(/você chegou até aqui por um motivo/i)).not.toBeInTheDocument();
  });

  it("calls user_products with the authenticated user's id", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(mockUserProductsEq).toHaveBeenCalledWith("user_id", "user-001");
    });
  });
});

/** Helper: checks if product skeleton is gone (product section rendered) */
function loadingP_done() {
  // When loading is done, either a course card link or empty state is present
  return (
    screen.queryByText("Inicie sua jornada") !== null ||
    screen.queryByText("Mulher Espiral") !== null
  );
}

/* ──────────────────────────────────────────────────────────── */
/* User WITH multiple products                                 */
/* ──────────────────────────────────────────────────────────── */

describe("DashboardPage — user with multiple products", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_PRODUCTS, loading: false });
    setupSupabaseMocks({
      ownedRows: [MOCK_OWNED_PRODUCT, MOCK_OWNED_PRODUCT_2],
      completedLessonIds: ["les-1", "les-6"],
      posts: [],
    });
  });

  it("renders the secondary product as a compact row card", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText("Inner Fire")).toBeInTheDocument();
    });
  });

  it("secondary product card links to /products/inner-fire", async () => {
    renderDashboard();
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /inner fire/i });
      expect(link).toHaveAttribute("href", "/products/inner-fire");
    });
  });

  it("renders cursos count as 2 in overall stats", async () => {
    renderDashboard();
    await waitFor(() => {
      // Stats row: "2 cursos"
      const statsRow = screen.getByText("cursos");
      expect(statsRow).toBeInTheDocument();
      // The "2" strong element should be adjacent
      const twoEls = screen.getAllByText("2");
      expect(twoEls.length).toBeGreaterThan(0);
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* User WITHOUT products                                       */
/* ──────────────────────────────────────────────────────────── */

describe("DashboardPage — user without products", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_NO_PRODUCTS, loading: false });
    setupSupabaseMocks({
      ownedRows: [],
      completedLessonIds: [],
      posts: MOCK_COMMUNITY_POSTS,
    });
  });

  it("renders 'Inicie sua jornada' empty state card", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText("Inicie sua jornada")).toBeInTheDocument();
    });
  });

  it("renders 'Adquira um curso' description in empty state", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/adquira um curso/i)).toBeInTheDocument();
    });
  });

  it("renders 'Conhecer cursos' CTA link pointing to checkout", async () => {
    renderDashboard();
    await waitFor(() => {
      const cta = screen.getByRole("link", { name: /conhecer cursos/i });
      expect(cta).toHaveAttribute("href", "/checkout/mulher-espiral");
    });
  });

  it("renders the upsell section with 'Você chegou até aqui por um motivo'", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/você chegou até aqui por um motivo/i)).toBeInTheDocument();
    });
  });

  it("renders 'Quero começar' CTA button in upsell section", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /quero começar/i })).toBeInTheDocument();
    });
  });

  it("'Quero começar' upsell link points to /checkout/mulher-espiral", async () => {
    renderDashboard();
    await waitFor(() => {
      const links = screen.getAllByRole("link", { name: /quero começar/i });
      links.forEach((link) => {
        expect(link).toHaveAttribute("href", "/checkout/mulher-espiral");
      });
    });
  });

  it("does NOT render course card or progress bar for no-product user", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.queryByText(/de.*aulas/i)).not.toBeInTheDocument();
    });
  });

  it("does NOT render overall progress section (Jornada geral)", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.queryByText("Jornada geral")).not.toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Community posts                                             */
/* ──────────────────────────────────────────────────────────── */

describe("DashboardPage — community posts", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_PRODUCTS, loading: false });
  });

  it("renders post titles from Supabase data", async () => {
    setupSupabaseMocks({ posts: MOCK_COMMUNITY_POSTS });
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText("Minha primeira semana na espiral")).toBeInTheDocument();
      expect(screen.getByText("Dúvida sobre o módulo 3")).toBeInTheDocument();
    });
  });

  it("renders anonymous_name for each post author", async () => {
    setupSupabaseMocks({ posts: MOCK_COMMUNITY_POSTS });
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText("Flor do Cerrado")).toBeInTheDocument();
      expect(screen.getByText("Maré Alta")).toBeInTheDocument();
    });
  });

  it("renders likes count for posts", async () => {
    setupSupabaseMocks({ posts: MOCK_COMMUNITY_POSTS });
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText("♡ 12")).toBeInTheDocument();
      expect(screen.getByText("♡ 4")).toBeInTheDocument();
    });
  });

  it("renders comments count for posts", async () => {
    setupSupabaseMocks({ posts: MOCK_COMMUNITY_POSTS });
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("7")).toBeInTheDocument();
    });
  });

  it("each post is a link to /community/topic/:id", async () => {
    setupSupabaseMocks({ posts: MOCK_COMMUNITY_POSTS });
    renderDashboard();
    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /minha primeira semana na espiral/i })
      ).toHaveAttribute("href", "/community/topic/post-001");
    });
  });

  it("renders 'Nenhum post ainda' empty state when posts is empty", async () => {
    setupSupabaseMocks({ posts: [] });
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/nenhum post ainda/i)).toBeInTheDocument();
    });
  });

  it("calls community_posts with is_visible = true filter", async () => {
    setupSupabaseMocks({ posts: [] });
    renderDashboard();
    await waitFor(() => {
      expect(mockCommunityPostsEq).toHaveBeenCalledWith("is_visible", true);
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Navigation links                                            */
/* ──────────────────────────────────────────────────────────── */

describe("DashboardPage — navigation links", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_PRODUCTS, loading: false });
    setupSupabaseMocks();
  });

  it("renders 'Ver todos' link to /products", async () => {
    renderDashboard();
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /ver todos/i });
      expect(link).toHaveAttribute("href", "/products");
    });
  });

  it("renders 'Ver tudo' link to /community in community section", async () => {
    renderDashboard();
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /ver tudo/i });
      expect(link).toHaveAttribute("href", "/community");
    });
  });

  it("renders 'Ver mais posts' link at bottom of community feed", async () => {
    renderDashboard();
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /ver mais posts/i });
      expect(link).toHaveAttribute("href", "/community");
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Page title                                                  */
/* ──────────────────────────────────────────────────────────── */

describe("DashboardPage — meta", () => {
  it("renders the page title via Helmet", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_PRODUCTS, loading: false });
    setupSupabaseMocks();
    renderDashboard();

    // Helmet sets document.title — in jsdom it should be present
    await waitFor(() => {
      expect(document.title).toContain("Início");
    });
  });
});
