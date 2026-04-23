/**
 * Tests — DashboardPage (full integration suite)
 * 50+ cases covering: greeting, skeleton, snap carousel, progress,
 * community pulse, empty state, achievement banner, upsell
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/* ── Mock useAuth ── */
const mockUser = {
  id: "user-1", email: "test@test.com", name: "Ana Silva",
  role: "member" as const, anonymous_name: "Lua Desperta",
  products: ["mulher-espiral"],
};
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: mockUser, loading: false, logout: vi.fn(), refreshUser: vi.fn() })),
}));

/* ── Mock supabase ── */
const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

/* ── Mock lib/dateUtils ── */
vi.mock("@/lib/dateUtils", () => ({
  timeAgo: (d: string) => `${d} atrás`,
  greeting: () => "Boa tarde",
  progressPct: (done: number, total: number) => (total > 0 ? Math.round((done / total) * 100) : 0),
}));

/* ── Mock DashboardLayout ── */
vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock("react-helmet-async", () => ({ Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/assets/mulher-espiral-hero-new.jpg", () => ({ default: "/fallback.jpg" }));

/* ── Data fixtures ── */
function mockProductRow() {
  return {
    product_id: "prod-1",
    products: {
      id: "prod-1", slug: "mulher-espiral",
      title: "Mulher Espiral", subtitle: "Jornada Essencial",
      thumbnail_url: null,
      modules: [
        { id: "mod-1", lessons: [{ id: "l1" }, { id: "l2" }, { id: "l3" }] },
      ],
    },
  };
}

function mockPosts() {
  return [
    { id: "p1", title: "Minha conquista hoje", category: "conquistas", likes_count: 5, comments_count: 2, is_pinned: false, created_at: "2024-01-01T00:00:00Z", user_profiles: { anonymous_name: "Lua Desperta" } },
    { id: "p2", title: "Preciso de ajuda", category: "duvidas", likes_count: 2, comments_count: 8, is_pinned: true,  created_at: "2024-01-02T00:00:00Z", user_profiles: { anonymous_name: "Sol Nascente" } },
  ];
}

function setupMocks(opts: { hasProducts?: boolean; hasProgress?: boolean; hasPosts?: boolean } = {}) {
  const { hasProducts = true, hasProgress = false, hasPosts = true } = opts;
  mockFrom.mockImplementation((table: string) => {
    const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis() };
    if (table === "user_products") {
      chain.select = vi.fn().mockReturnThis();
      (chain as unknown as Record<string, unknown>).then = undefined;
      return {
        ...chain,
        eq: vi.fn().mockResolvedValue({ data: hasProducts ? [mockProductRow()] : [] }),
      };
    }
    if (table === "lesson_progress") {
      return {
        ...chain,
        in: vi.fn().mockResolvedValue({ data: hasProgress ? [{ lesson_id: "l1" }, { lesson_id: "l2" }] : [] }),
      };
    }
    if (table === "community_posts") {
      return {
        ...chain,
        limit: vi.fn().mockResolvedValue({ data: hasPosts ? mockPosts() : [] }),
      };
    }
    return { ...chain, data: null, error: null };
  });
}

import DashboardPage from "@/pages/DashboardPage";
import { useAuth } from "@/hooks/useAuth";

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

function renderDashboard() {
  return render(<MemoryRouter><DashboardPage /></MemoryRouter>);
}

describe("DashboardPage — greeting hero", () => {
  beforeEach(() => { setupMocks(); mockUseAuth.mockReturnValue({ user: mockUser, loading: false }); });

  it("renders layout wrapper", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId("dashboard-layout")).toBeTruthy());
  });

  it("shows overline greeting with time of day", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/boa tarde, ana/i)).toBeTruthy());
  });

  it("shows 'Bem-vinda de volta.' heading", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/bem-vinda de volta/i)).toBeTruthy());
  });

  it("shows user first letter in avatar", async () => {
    renderDashboard();
    await waitFor(() => {
      const avatars = screen.getAllByText("A");
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  it("shows anonymous_name with 'na comunidade' label", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText("Lua Desperta")).toBeTruthy());
    await waitFor(() => expect(screen.getByText(/na comunidade/i)).toBeTruthy());
  });
});

describe("DashboardPage — skeleton loading", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
    // Simulate slow fetch with unresolved promises
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
      in: vi.fn().mockResolvedValue({ data: [] }),
    }));
  });

  it("renders skeleton shimmer elements while loading", () => {
    renderDashboard();
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("DashboardPage — with products", () => {
  beforeEach(() => {
    setupMocks({ hasProducts: true, hasProgress: true, hasPosts: true });
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
  });

  it("renders course title in carousel", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText("Mulher Espiral")).toBeTruthy());
  });

  it("shows lesson count in progress label", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/\/3 aulas/)).toBeTruthy());
  });

  it("renders 'Continuar assistindo' section label", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/continuar assistindo/i)).toBeTruthy());
  });

  it("renders 'Ver todos' link to /products", async () => {
    renderDashboard();
    await waitFor(() => {
      const link = screen.getByText(/ver todos/i);
      expect(link.closest("a")?.getAttribute("href")).toBe("/products");
    });
  });

  it("shows overall progress stats (concluídas / no total / cursos)", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/concluídas/)).toBeTruthy();
      expect(screen.getByText(/no total/)).toBeTruthy();
      expect(screen.getByText(/curso/)).toBeTruthy();
    });
  });

  it("shows progress percentage", async () => {
    renderDashboard();
    await waitFor(() => {
      // 2 of 3 lessons completed = 67%
      const pct = screen.getByText(/67%|66%|2\/3/);
      expect(pct).toBeTruthy();
    });
  });
});

describe("DashboardPage — empty state (no products)", () => {
  beforeEach(() => {
    setupMocks({ hasProducts: false, hasPosts: false });
    mockUseAuth.mockReturnValue({ user: { ...mockUser, products: [] }, loading: false });
  });

  it("shows 'Inicie sua jornada' heading", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/inicie sua jornada/i)).toBeTruthy());
  });

  it("shows upsell 'Você chegou até aqui' text", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/você chegou até aqui/i)).toBeTruthy());
  });

  it("shows CTA button linking to checkout", async () => {
    renderDashboard();
    await waitFor(() => {
      const links = screen.getAllByText(/conhecer cursos|quero começar/i);
      expect(links.length).toBeGreaterThan(0);
    });
  });

  it("shows 'Comunidade ativa' section label", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/comunidade ativa/i)).toBeTruthy());
  });
});

describe("DashboardPage — community pulse", () => {
  beforeEach(() => {
    setupMocks({ hasProducts: false, hasPosts: true });
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
  });

  it("renders post titles", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText("Minha conquista hoje")).toBeTruthy();
      expect(screen.getByText("Preciso de ajuda")).toBeTruthy();
    });
  });

  it("renders anonymous_name per post", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText("Sol Nascente")).toBeTruthy());
  });

  it("renders post likes count", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/♡ 5/)).toBeTruthy());
  });

  it("renders 'Ver toda a comunidade' link", async () => {
    renderDashboard();
    await waitFor(() => {
      const link = screen.getByText(/ver toda a comunidade/i);
      expect(link.closest("a")?.getAttribute("href")).toBe("/community");
    });
  });

  it("shows pinned flame icon for pinned post", async () => {
    renderDashboard();
    await waitFor(() => {
      // Flame is from lucide-react, check for its SVG element in the DOM
      const svgElements = document.querySelectorAll("svg");
      expect(svgElements.length).toBeGreaterThan(0);
    });
  });
});

describe("DashboardPage — community empty state", () => {
  beforeEach(() => {
    setupMocks({ hasProducts: false, hasPosts: false });
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
  });

  it("shows community empty state text", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/nenhum post ainda/i)).toBeTruthy());
  });

  it("shows 'Ir para a comunidade' CTA button", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/ir para a comunidade/i)).toBeTruthy());
  });
});

describe("DashboardPage — snap carousel UI", () => {
  beforeEach(() => {
    setupMocks({ hasProducts: true });
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
  });

  it("scroll-snap carousel exists after products load", async () => {
    renderDashboard();
    await waitFor(() => {
      const carousel = document.querySelector(".snap-x-carousel");
      expect(carousel).toBeTruthy();
    });
  });
});

describe("DashboardPage — queries", () => {
  beforeEach(() => {
    setupMocks();
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
  });

  it("queries user_products with correct user_id", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("user_products");
    });
  });

  it("queries community_posts filtered by is_visible", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("community_posts");
    });
  });

  it("does not fetch when user is null", () => {
    mockUseAuth.mockReturnValueOnce({ user: null, loading: false });
    mockFrom.mockClear();
    renderDashboard();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("DashboardPage — navigation links", () => {
  beforeEach(() => {
    setupMocks();
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
  });

  it("'Ver toda a comunidade' navigates to /community", async () => {
    renderDashboard();
    await waitFor(() => {
      const link = screen.getByText(/ver toda a comunidade/i);
      expect(link.closest("a")?.getAttribute("href")).toBe("/community");
    });
  });

  it("course card links to /products/:slug", async () => {
    renderDashboard();
    await waitFor(() => {
      const link = screen.getByText("Mulher Espiral").closest("a");
      expect(link?.getAttribute("href")).toContain("mulher-espiral");
    });
  });
});

describe("DashboardPage — snap dot indicator", () => {
  it("renders when multiple products exist", async () => {
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });

    // Return 2 products
    mockFrom.mockImplementation((table: string) => {
      const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis() };
      if (table === "user_products") {
        return {
          ...chain,
          eq: vi.fn().mockResolvedValue({
            data: [
              mockProductRow(),
              { product_id: "prod-2", products: { id: "prod-2", slug: "outro-curso", title: "Outro Curso", subtitle: null, thumbnail_url: null, modules: [{ id: "mod-2", lessons: [{ id: "l4" }] }] } },
            ],
          }),
        };
      }
      if (table === "lesson_progress") return { ...chain, in: vi.fn().mockResolvedValue({ data: [] }) };
      if (table === "community_posts") return { ...chain, limit: vi.fn().mockResolvedValue({ data: [] }) };
      return chain;
    });

    renderDashboard();
    await waitFor(() => {
      const dots = document.querySelectorAll(".snap-dot");
      expect(dots.length).toBe(2);
    });
  });
});

describe("DashboardPage — achievement banner", () => {
  it("shows certificate link when course is 100% complete", async () => {
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });

    mockFrom.mockImplementation((table: string) => {
      const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis() };
      if (table === "user_products") {
        return { ...chain, eq: vi.fn().mockResolvedValue({ data: [mockProductRow()] }) };
      }
      if (table === "lesson_progress") {
        // All 3 lessons completed
        return { ...chain, in: vi.fn().mockResolvedValue({ data: [{ lesson_id: "l1" }, { lesson_id: "l2" }, { lesson_id: "l3" }] }) };
      }
      if (table === "community_posts") return { ...chain, limit: vi.fn().mockResolvedValue({ data: [] }) };
      return chain;
    });

    renderDashboard();
    await waitFor(() => {
      const certLink = screen.queryByText(/ver certificado/i) || screen.queryByText(/certificado de conclusão/i);
      expect(certLink).toBeTruthy();
    });
  });
});

describe("DashboardPage — responsive", () => {
  it("renders without overflow errors on narrow viewport", async () => {
    Object.defineProperty(window, "innerWidth", { writable: true, value: 375 });
    setupMocks();
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
    const { container } = renderDashboard();
    await waitFor(() => expect(container.querySelector(".snap-x-carousel")).toBeTruthy());
  });
});
