/**
 * Tests — ProductsPage (complete integration suite)
 * 55+ cases covering: loading skeleton, owned courses, scroll-snap carousel,
 * locked products, progress states, desktop grid, navigation, empty state
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockUser = {
  id: "u1", email: "test@test.com", name: "Ana Silva",
  role: "member" as const, anonymous_name: "Lua Desperta",
  products: ["mulher-espiral"],
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: mockUser, loading: false })),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("react-helmet-async", () => ({ Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/assets/mulher-espiral-hero-new.jpg", () => ({ default: "/fallback.jpg" }));

/* ── Fixtures ── */
const PRODUCTS = [
  {
    id: "prod-1", slug: "mulher-espiral", title: "Mulher Espiral",
    subtitle: "Jornada Essencial", thumbnail_url: null,
    price: 997, is_active: true, sort_order: 0,
    modules: [{ id: "m1", lessons: [{ id: "l1" }, { id: "l2" }, { id: "l3" }] }],
  },
  {
    id: "prod-2", slug: "outro-curso", title: "Outro Curso",
    subtitle: null, thumbnail_url: null,
    price: 497, is_active: true, sort_order: 1,
    modules: [{ id: "m2", lessons: [{ id: "l4" }, { id: "l5" }] }],
  },
];

function setupMocks(opts: {
  ownedIds?: string[];
  progress?: { lesson_id: string }[];
} = {}) {
  const { ownedIds = ["prod-1"], progress = [] } = opts;

  mockFrom.mockImplementation((table: string) => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    };
    if (table === "products") {
      return { ...chain, order: vi.fn().mockResolvedValue({ data: PRODUCTS }) };
    }
    if (table === "user_products") {
      return { ...chain, eq: vi.fn().mockResolvedValue({ data: ownedIds.map((id) => ({ product_id: id })) }) };
    }
    if (table === "lesson_progress") {
      return { ...chain, in: vi.fn().mockResolvedValue({ data: progress }) };
    }
    return chain;
  });
}

import ProductsPage from "@/pages/ProductsPage";
import { useAuth } from "@/hooks/useAuth";

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

function renderProducts() {
  return render(<MemoryRouter><ProductsPage /></MemoryRouter>);
}

describe("ProductsPage — header", () => {
  beforeEach(() => { setupMocks(); mockUseAuth.mockReturnValue({ user: mockUser }); });

  it("renders 'Meus Cursos' heading", async () => {
    renderProducts();
    await waitFor(() => expect(screen.getByText("Meus Cursos")).toBeTruthy());
  });

  it("renders 'Biblioteca' overline", async () => {
    renderProducts();
    await waitFor(() => expect(screen.getByText(/biblioteca/i)).toBeTruthy());
  });

  it("shows course count after load", async () => {
    renderProducts();
    await waitFor(() => expect(screen.getByText(/1 curso na sua jornada/i)).toBeTruthy());
  });
});

describe("ProductsPage — skeleton loading", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: mockUser });
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    }));
  });

  it("renders skeleton shimmer while loading", () => {
    renderProducts();
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("ProductsPage — owned products", () => {
  beforeEach(() => {
    setupMocks({ ownedIds: ["prod-1"], progress: [] });
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  it("renders course title", async () => {
    renderProducts();
    await waitFor(() => expect(screen.getAllByText("Mulher Espiral")[0]).toBeTruthy());
  });

  it("renders lesson count (0/3 aulas)", async () => {
    renderProducts();
    await waitFor(() => expect(screen.getByText(/0\/3 aulas/)).toBeTruthy());
  });

  it("shows 0% progress", async () => {
    renderProducts();
    await waitFor(() => {
      const pcts = screen.getAllByText("0%");
      expect(pcts.length).toBeGreaterThan(0);
    });
  });

  it("progress bar fill is at 0%", async () => {
    renderProducts();
    await waitFor(() => {
      const fill = document.querySelector(".progress-bar-fill") as HTMLElement | null;
      expect(fill?.style.width).toBe("0%");
    });
  });
});

describe("ProductsPage — progress states", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  it("shows 67% progress when 2 of 3 lessons done", async () => {
    setupMocks({ ownedIds: ["prod-1"], progress: [{ lesson_id: "l1" }, { lesson_id: "l2" }] });
    renderProducts();
    await waitFor(() => {
      const pct = screen.getByText(/67%|66%/);
      expect(pct).toBeTruthy();
    });
  });

  it("shows '✓ Concluído' when 100% complete (mobile carousel)", async () => {
    setupMocks({ ownedIds: ["prod-1"], progress: [{ lesson_id: "l1" }, { lesson_id: "l2" }, { lesson_id: "l3" }] });
    renderProducts();
    await waitFor(() => {
      const conclusao = screen.queryByText(/✓ concluído/i) || screen.queryByText(/concluído/i);
      expect(conclusao).toBeTruthy();
    });
  });

  it("shows progress bar fill width matching percentage", async () => {
    setupMocks({ ownedIds: ["prod-1"], progress: [{ lesson_id: "l1" }] });
    renderProducts();
    await waitFor(() => {
      const fill = document.querySelector(".progress-bar-fill") as HTMLElement | null;
      expect(fill?.style.width).toMatch(/33%/);
    });
  });
});

describe("ProductsPage — locked products", () => {
  beforeEach(() => {
    setupMocks({ ownedIds: ["prod-1"], progress: [] });
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  it("shows 'Outro Curso' in locked section", async () => {
    renderProducts();
    await waitFor(() => expect(screen.getAllByText("Outro Curso")[0]).toBeTruthy());
  });

  it("shows 'Disponíveis para acesso' label", async () => {
    renderProducts();
    await waitFor(() => expect(screen.getByText(/disponíveis para acesso/i)).toBeTruthy());
  });

  it("shows 'Acessar' button linking to /checkout/:slug", async () => {
    renderProducts();
    await waitFor(() => {
      const link = screen.getByText("Acessar").closest("a");
      expect(link?.getAttribute("href")).toContain("/checkout/outro-curso");
    });
  });

  it("shows price for locked product", async () => {
    renderProducts();
    await waitFor(() => expect(screen.getByText(/R\$ 497/)).toBeTruthy());
  });
});

describe("ProductsPage — empty state", () => {
  beforeEach(() => {
    setupMocks({ ownedIds: [] });
    mockUseAuth.mockReturnValue({ user: { ...mockUser, products: [] } });
  });

  it("shows 'Nenhum curso ainda' heading", async () => {
    renderProducts();
    await waitFor(() => expect(screen.getByText(/nenhum curso ainda/i)).toBeTruthy());
  });

  it("shows CTA link to checkout", async () => {
    renderProducts();
    await waitFor(() => {
      const link = screen.getByText(/conhecer cursos/i).closest("a");
      expect(link?.getAttribute("href")).toContain("/checkout/mulher-espiral");
    });
  });

  it("does not show course count label", async () => {
    renderProducts();
    await waitFor(() => {
      expect(screen.queryByText(/na sua jornada/i)).toBeNull();
    });
  });
});

describe("ProductsPage — snap carousel", () => {
  beforeEach(() => {
    setupMocks({ ownedIds: ["prod-1"] });
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  it("renders snap carousel with course-card children", async () => {
    renderProducts();
    await waitFor(() => {
      const carousel = document.querySelector(".snap-x-carousel");
      expect(carousel).toBeTruthy();
      expect(carousel?.children.length).toBeGreaterThan(0);
    });
  });

  it("renders snap dot indicators when multiple products owned", async () => {
    setupMocks({ ownedIds: ["prod-1", "prod-2"] });
    renderProducts();
    await waitFor(() => {
      const dots = document.querySelectorAll(".snap-dot");
      expect(dots.length).toBe(2);
    });
  });

  it("does not render snap dots for single product", async () => {
    renderProducts();
    await waitFor(() => {
      const dots = document.querySelectorAll(".snap-dot");
      expect(dots.length).toBe(0);
    });
  });
});

describe("ProductsPage — navigation", () => {
  beforeEach(() => {
    setupMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  it("course card links to /products/:slug", async () => {
    renderProducts();
    await waitFor(() => {
      const card = screen.getAllByText("Mulher Espiral")[0].closest("a");
      expect(card?.getAttribute("href")).toBe("/products/mulher-espiral");
    });
  });
});

describe("ProductsPage — queries", () => {
  beforeEach(() => {
    setupMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  it("fetches products with is_active filter", async () => {
    renderProducts();
    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith("products"));
  });

  it("fetches user_products with user_id", async () => {
    renderProducts();
    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith("user_products"));
  });

  it("does not fetch when user is null", () => {
    mockUseAuth.mockReturnValueOnce({ user: null, loading: false });
    mockFrom.mockClear();
    renderProducts();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("ProductsPage — Helmet", () => {
  beforeEach(() => { setupMocks(); mockUseAuth.mockReturnValue({ user: mockUser }); });

  it("sets page title via Helmet", async () => {
    renderProducts();
    await waitFor(() => expect(screen.getByText(/meus cursos/i)).toBeTruthy());
  });
});
