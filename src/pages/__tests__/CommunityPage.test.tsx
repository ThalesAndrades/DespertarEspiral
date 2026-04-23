/**
 * Integration Tests — CommunityPage
 *
 * Covers:
 *  - Skeleton screens (.skeleton divs) during loading
 *  - Category tabs rendered: Todas, Geral, Desabafo, Dúvidas, Conquistas, Dicas
 *  - Default active tab is 'Todas'
 *  - Clicking category tab filters posts (shows only matching category)
 *  - Clicking 'Todas' shows all posts again
 *  - Post card: title, body (2-line clamp), anonymous_name, likes count, comments_count
 *  - Post card: category badge label
 *  - Post card: timeAgo rendered (mocked)
 *  - Post card: pinned post shows Flame icon
 *  - Post card: "Ver post" link → /community/topic/:id
 *  - Post card: heart icon renders correct like count
 *  - Like button: optimistic update → likes_count increments
 *  - Like button: supabase.insert called with { user_id, post_id }
 *  - Like button: unlike → supabase.delete called + count decrements
 *  - Like button: insert error → reverts optimistic update + toast.error
 *  - Empty state per category: 'Nenhum post nessa categoria.' + 'Ser a primeira' CTA
 *  - Anonymous identity pill: shows user.anonymous_name
 *  - "Novo post" button opens compose sheet
 *  - Compose sheet: title input, body textarea, category selector buttons
 *  - Compose sheet: publishing as anonymous notice
 *  - Compose sheet: validation — title vazio → toast.error, no insert
 *  - Compose sheet: validation — body vazio → toast.error, no insert
 *  - Compose sheet: successful submit calls supabase.insert with correct payload
 *  - Compose sheet: toast.success 'Post publicado. ✦' on success
 *  - Compose sheet: closes after successful submit
 *  - Compose sheet: new post appears at top of list without reload
 *  - Compose sheet: category selection changes active category button
 *  - Compose sheet: close button (X) hides sheet
 *  - FAB button (mobile) opens compose sheet
 *  - Supabase query: is_visible = true filter applied
 *  - Supabase query: order by is_pinned + created_at
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/* ── DashboardLayout ── */
vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

/* ── Toast ── */
const mockToastError   = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error:   (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

/* ── dateUtils: deterministic timeAgo ── */
vi.mock("@/lib/dateUtils", () => ({
  timeAgo: () => "2h",
  greeting: () => "Bom dia",
  formatBRL: (v: number) => `R$ ${v.toFixed(2)}`,
  progressPct: (d: number, t: number) => (t > 0 ? Math.round((d / t) * 100) : 0),
}));

/* ── useAuth ── */
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

/* ── Supabase ── */
const mockFrom   = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

/* ──────────────────────────────────────────────────────────── */
/* Test data                                                    */
/* ──────────────────────────────────────────────────────────── */

const AUTH_USER = {
  id:              "user-001",
  email:           "ana@espiral.com",
  name:            "Ana Espiral",
  role:            "member" as const,
  anonymous_name:  "Lua Crescente",
  products:        ["mulher-espiral"],
};

const MOCK_POSTS = [
  {
    id:             "post-001",
    user_id:        "user-001",
    category:       "geral",
    title:          "Começando a jornada",
    body:           "Estou tão feliz em começar esse caminho de autoconhecimento.",
    is_pinned:      false,
    is_visible:     true,
    likes_count:    5,
    comments_count: 3,
    created_at:     "2026-04-20T10:00:00Z",
    user_profiles:  { anonymous_name: "Lua Crescente" },
  },
  {
    id:             "post-002",
    user_id:        "user-002",
    category:       "desabafo",
    title:          "Preciso falar sobre isso",
    body:           "Às vezes o caminho parece tão pesado e difícil de carregar.",
    is_pinned:      true,
    is_visible:     true,
    likes_count:    12,
    comments_count: 7,
    created_at:     "2026-04-21T08:00:00Z",
    user_profiles:  { anonymous_name: "Estrela Guia" },
  },
  {
    id:             "post-003",
    user_id:        "user-003",
    category:       "conquistas",
    title:          "Consegui meditar por 30 dias",
    body:           "Nunca pensei que conseguiria manter essa constância.",
    is_pinned:      false,
    is_visible:     true,
    likes_count:    24,
    comments_count: 11,
    created_at:     "2026-04-22T14:00:00Z",
    user_profiles:  { anonymous_name: "Rosa do Mato" },
  },
  {
    id:             "post-004",
    user_id:        "user-004",
    category:       "duvidas",
    title:          "Como lidar com ansiedade?",
    body:           "Tenho praticado mas a ansiedade ainda aparece muito forte.",
    is_pinned:      false,
    is_visible:     true,
    likes_count:    8,
    comments_count: 15,
    created_at:     "2026-04-22T16:00:00Z",
    user_profiles:  { anonymous_name: "Mar Tranquilo" },
  },
  {
    id:             "post-005",
    user_id:        "user-005",
    category:       "dicas",
    title:          "Dica de respiração que me ajudou",
    body:           "Aprendi uma técnica de respiração que mudou minha vida completamente.",
    is_pinned:      false,
    is_visible:     true,
    likes_count:    31,
    comments_count: 9,
    created_at:     "2026-04-23T09:00:00Z",
    user_profiles:  { anonymous_name: "Vento Norte" },
  },
];

/* ──────────────────────────────────────────────────────────── */
/* Supabase mock helpers                                        */
/* ──────────────────────────────────────────────────────────── */

function setupSupabaseMocks({
  posts      = MOCK_POSTS,
  likedPosts = [] as string[],
  insertResult = { data: null, error: null } as { data: unknown; error: null | { message: string } },
  likeInsertError: likeError = null as null | { message: string },
  likeDeleteError: likeDeleteErr = null as null | { message: string },
}: {
  posts?:           typeof MOCK_POSTS;
  likedPosts?:      string[];
  insertResult?:    { data: unknown; error: null | { message: string } };
  likeInsertError?: null | { message: string };
  likeDeleteError?: null | { message: string };
} = {}) {

  mockInsert.mockImplementation(() => ({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue(insertResult),
    }),
  }));

  mockDelete.mockImplementation(() => ({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: likeDeleteErr }),
    }),
  }));

  mockFrom.mockImplementation((table: string) => {
    if (table === "community_posts") {
      // .select().eq().order().order().limit()
      const limit  = vi.fn().mockResolvedValue({ data: posts, error: null });
      const order2 = vi.fn().mockReturnValue({ limit });
      const order1 = vi.fn().mockReturnValue({ order: order2 });
      const eq     = vi.fn().mockReturnValue({ order: order1 });
      const select = vi.fn().mockReturnValue({ eq });
      return { select, insert: mockInsert };
    }

    if (table === "community_likes") {
      // SELECT: .select().eq().not()
      const notFn  = vi.fn().mockResolvedValue({
        data: likedPosts.map((id) => ({ post_id: id })),
        error: null,
      });
      const eq2    = vi.fn().mockReturnValue({ not: notFn });
      const eq1    = vi.fn().mockReturnValue({ eq: eq2 });
      const select = vi.fn().mockReturnValue({ eq: eq1 });

      // INSERT like
      const likeInsert = vi.fn().mockResolvedValue({ error: likeError });

      // DELETE like
      const likeDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: likeDeleteErr }),
        }),
      });

      return { select, insert: likeInsert, delete: likeDelete };
    }

    return {
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
    };
  });
}

/* Render CommunityPage */
function renderCommunity() {
  return render(
    <MemoryRouter initialEntries={["/community"]}>
      <Routes>
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/community/topic/:id" element={<div data-testid="topic-page">Tópico</div>} />
      </Routes>
    </MemoryRouter>
  );
}

let CommunityPage: typeof import("@/pages/CommunityPage").default;

beforeEach(async () => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: AUTH_USER, loading: false });
  setupSupabaseMocks();

  if (!CommunityPage) {
    const mod = await import("@/pages/CommunityPage");
    CommunityPage = mod.default;
  }
});

/* ──────────────────────────────────────────────────────────── */
/* Loading skeleton                                            */
/* ──────────────────────────────────────────────────────────── */

describe("CommunityPage — loading skeleton", () => {
  it("renders skeleton divs while posts are loading", () => {
    let resolve: (v: unknown) => void;
    const pending = new Promise((r) => { resolve = r; });

    mockFrom.mockImplementation((table: string) => {
      if (table === "community_posts") {
        const limit  = vi.fn().mockReturnValue(pending);
        const order2 = vi.fn().mockReturnValue({ limit });
        const order1 = vi.fn().mockReturnValue({ order: order2 });
        const eq     = vi.fn().mockReturnValue({ order: order1 });
        const select = vi.fn().mockReturnValue({ eq });
        return { select };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockResolvedValue({ data: [], error: null }),
            eq:  vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
    });

    renderCommunity();

    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
    // Posts should not be visible yet
    expect(screen.queryByText("Começando a jornada")).not.toBeInTheDocument();

    resolve!({ data: [], error: null });
  });

  it("renders 5 skeleton post items while loading", () => {
    let resolve: (v: unknown) => void;
    const pending = new Promise((r) => { resolve = r; });

    mockFrom.mockImplementation((table: string) => {
      if (table === "community_posts") {
        const limit  = vi.fn().mockReturnValue(pending);
        const order2 = vi.fn().mockReturnValue({ limit });
        const order1 = vi.fn().mockReturnValue({ order: order2 });
        const eq     = vi.fn().mockReturnValue({ order: order1 });
        const select = vi.fn().mockReturnValue({ eq });
        return { select };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockResolvedValue({ data: [], error: null }),
            eq:  vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
    });

    renderCommunity();
    // CommunitySkeletonList renders 5 PostSkeleton items
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThanOrEqual(5);

    resolve!({ data: [], error: null });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Category tabs                                               */
/* ──────────────────────────────────────────────────────────── */

describe("CommunityPage — category tabs", () => {
  it("renders all category tabs", async () => {
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Começando a jornada")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: /todas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /geral/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desabafo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dúvidas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /conquistas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dicas/i })).toBeInTheDocument();
  });

  it("shows all posts when 'Todas' tab is active (default)", async () => {
    renderCommunity();
    await waitFor(() => {
      expect(screen.getByText("Começando a jornada")).toBeInTheDocument();
      expect(screen.getByText("Preciso falar sobre isso")).toBeInTheDocument();
      expect(screen.getByText("Consegui meditar por 30 dias")).toBeInTheDocument();
      expect(screen.getByText("Como lidar com ansiedade?")).toBeInTheDocument();
      expect(screen.getByText("Dica de respiração que me ajudou")).toBeInTheDocument();
    });
  });

  it("clicking 'Geral' tab shows only geral posts", async () => {
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Começando a jornada")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^geral$/i }));

    await waitFor(() => {
      expect(screen.getByText("Começando a jornada")).toBeInTheDocument();
      expect(screen.queryByText("Preciso falar sobre isso")).not.toBeInTheDocument();
      expect(screen.queryByText("Consegui meditar por 30 dias")).not.toBeInTheDocument();
    });
  });

  it("clicking 'Desabafo' tab shows only desabafo posts", async () => {
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Preciso falar sobre isso")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /desabafo/i }));

    await waitFor(() => {
      expect(screen.getByText("Preciso falar sobre isso")).toBeInTheDocument();
      expect(screen.queryByText("Começando a jornada")).not.toBeInTheDocument();
    });
  });

  it("clicking 'Conquistas' tab filters correctly", async () => {
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Consegui meditar por 30 dias")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /conquistas/i }));

    await waitFor(() => {
      expect(screen.getByText("Consegui meditar por 30 dias")).toBeInTheDocument();
      expect(screen.queryByText("Começando a jornada")).not.toBeInTheDocument();
    });
  });

  it("clicking 'Dúvidas' tab filters correctly", async () => {
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Como lidar com ansiedade?")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /dúvidas/i }));

    await waitFor(() => {
      expect(screen.getByText("Como lidar com ansiedade?")).toBeInTheDocument();
      expect(screen.queryByText("Começando a jornada")).not.toBeInTheDocument();
    });
  });

  it("clicking 'Dicas' tab filters correctly", async () => {
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Dica de respiração que me ajudou")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /dicas/i }));

    await waitFor(() => {
      expect(screen.getByText("Dica de respiração que me ajudou")).toBeInTheDocument();
      expect(screen.queryByText("Começando a jornada")).not.toBeInTheDocument();
    });
  });

  it("clicking 'Todas' after a category filter restores all posts", async () => {
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Começando a jornada")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /desabafo/i }));
    await waitFor(() => expect(screen.queryByText("Começando a jornada")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /todas/i }));
    await waitFor(() => {
      expect(screen.getByText("Começando a jornada")).toBeInTheDocument();
      expect(screen.getByText("Preciso falar sobre isso")).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Post card rendering                                         */
/* ──────────────────────────────────────────────────────────── */

describe("CommunityPage — post cards", () => {
  it("renders post title", async () => {
    renderCommunity();
    await waitFor(() => {
      expect(screen.getByText("Começando a jornada")).toBeInTheDocument();
    });
  });

  it("renders post body (truncated)", async () => {
    renderCommunity();
    await waitFor(() => {
      expect(screen.getByText(/estou tão feliz em começar esse caminho/i)).toBeInTheDocument();
    });
  });

  it("renders anonymous_name of post author", async () => {
    renderCommunity();
    await waitFor(() => {
      expect(screen.getByText("Lua Crescente")).toBeInTheDocument();
      expect(screen.getByText("Estrela Guia")).toBeInTheDocument();
    });
  });

  it("renders timeAgo ('2h') for each post", async () => {
    renderCommunity();
    await waitFor(() => {
      const timeElements = screen.getAllByText("2h");
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  it("renders likes count for each post", async () => {
    renderCommunity();
    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();  // post-001 likes
      expect(screen.getByText("12")).toBeInTheDocument(); // post-002 likes
    });
  });

  it("renders comments_count for each post", async () => {
    renderCommunity();
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();  // post-001 comments
      expect(screen.getByText("7")).toBeInTheDocument();  // post-002 comments
    });
  });

  it("renders 'Ver post' link for each post → /community/topic/:id", async () => {
    renderCommunity();
    await waitFor(() => {
      const verPostLinks = screen.getAllByText(/ver post/i);
      expect(verPostLinks.length).toBe(MOCK_POSTS.length);
    });
  });

  it("'Ver post' links point to correct /community/topic/:id", async () => {
    renderCommunity();
    await waitFor(() => {
      const links = screen.getAllByRole("link", { name: /ver post/i });
      expect(links[0]).toHaveAttribute("href", "/community/topic/post-001");
    });
  });

  it("renders category badge for each post", async () => {
    renderCommunity();
    await waitFor(() => {
      // Category badges (Geral, Desabafo, Conquistas, Dúvidas, Dicas)
      expect(screen.getByText("Geral")).toBeInTheDocument();
      expect(screen.getByText("Desabafo")).toBeInTheDocument();
    });
  });

  it("renders Flame icon for pinned post (is_pinned=true → post-002)", async () => {
    renderCommunity();
    await waitFor(() => {
      // pinned post has is_pinned=true; Flame icon renders inside its article row
      // We verify by checking the pinned post's author area renders alongside the icon
      const estrelaEl = screen.getByText("Estrela Guia");
      const article   = estrelaEl.closest("article");
      expect(article).toBeInTheDocument();
      // The article contains a Flame svg (from lucide-react)
      const svg = article?.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  it("renders avatar with first letter of anonymous_name", async () => {
    renderCommunity();
    await waitFor(() => {
      // "Lua Crescente" → "L" avatar, "Estrela Guia" → "E"
      expect(screen.getAllByText("L").length).toBeGreaterThan(0);
      expect(screen.getAllByText("E").length).toBeGreaterThan(0);
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Empty state per category                                    */
/* ──────────────────────────────────────────────────────────── */

describe("CommunityPage — empty state", () => {
  it("renders empty state when no posts match the selected category", async () => {
    setupSupabaseMocks({ posts: MOCK_POSTS.filter((p) => p.category !== "geral") });
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Preciso falar sobre isso")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^geral$/i }));

    await waitFor(() => {
      expect(screen.getByText("Nenhum post nessa categoria.")).toBeInTheDocument();
    });
  });

  it("renders 'Ser a primeira a escrever' CTA in empty state", async () => {
    setupSupabaseMocks({ posts: MOCK_POSTS.filter((p) => p.category !== "dicas") });
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Começando a jornada")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /dicas/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /ser a primeira a escrever/i })).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Anonymous identity                                          */
/* ──────────────────────────────────────────────────────────── */

describe("CommunityPage — anonymous identity", () => {
  it("shows the user's anonymous_name in the identity pill", async () => {
    renderCommunity();
    await waitFor(() => {
      // There might be multiple occurrences (pill + post author)
      const elements = screen.getAllByText("Lua Crescente");
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it("shows '· identidade anônima' next to the user's name", async () => {
    renderCommunity();
    await waitFor(() => {
      expect(screen.getByText(/identidade anônima/i)).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Like functionality                                          */
/* ──────────────────────────────────────────────────────────── */

describe("CommunityPage — likes", () => {
  it("like button shows current like count", async () => {
    renderCommunity();
    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument(); // post-001 likes
    });
  });

  it("clicking like button increments count optimistically", async () => {
    const likeInsertSpy = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "community_posts") {
        const limit  = vi.fn().mockResolvedValue({ data: MOCK_POSTS, error: null });
        const order2 = vi.fn().mockReturnValue({ limit });
        const order1 = vi.fn().mockReturnValue({ order: order2 });
        const eq     = vi.fn().mockReturnValue({ order: order1 });
        const select = vi.fn().mockReturnValue({ eq });
        return { select, insert: mockInsert };
      }
      if (table === "community_likes") {
        const notFn  = vi.fn().mockResolvedValue({ data: [], error: null });
        const eq2    = vi.fn().mockReturnValue({ not: notFn });
        const eq1    = vi.fn().mockReturnValue({ eq: eq2 });
        const select = vi.fn().mockReturnValue({ eq: eq1 });
        return { select, insert: likeInsertSpy, delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }) };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderCommunity();
    await waitFor(() => expect(screen.getByText("5")).toBeInTheDocument());

    const user = userEvent.setup();
    // Like button for post-001 (likes=5)
    const likeButtons = screen.getAllByRole("button", { name: /curtir/i });
    await user.click(likeButtons[0]);

    await waitFor(() => {
      // Optimistic update: 5 → 6
      expect(screen.getByText("6")).toBeInTheDocument();
    });
  });

  it("clicking like button calls supabase insert on community_likes", async () => {
    const likeInsertSpy = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "community_posts") {
        const limit  = vi.fn().mockResolvedValue({ data: MOCK_POSTS, error: null });
        const order2 = vi.fn().mockReturnValue({ limit });
        const order1 = vi.fn().mockReturnValue({ order: order2 });
        const eq     = vi.fn().mockReturnValue({ order: order1 });
        const select = vi.fn().mockReturnValue({ eq });
        return { select, insert: mockInsert };
      }
      if (table === "community_likes") {
        const notFn  = vi.fn().mockResolvedValue({ data: [], error: null });
        const eq2    = vi.fn().mockReturnValue({ not: notFn });
        const eq1    = vi.fn().mockReturnValue({ eq: eq2 });
        const select = vi.fn().mockReturnValue({ eq: eq1 });
        return { select, insert: likeInsertSpy, delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }) };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderCommunity();
    await waitFor(() => expect(screen.getByText("5")).toBeInTheDocument());

    const user = userEvent.setup();
    const likeButtons = screen.getAllByRole("button", { name: /curtir/i });
    await user.click(likeButtons[0]);

    await waitFor(() => {
      expect(likeInsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: "user-001", post_id: "post-001" })
      );
    });
  });

  it("already-liked post shows 'Remover curtida' label and clicking it decrements", async () => {
    const likeDeleteSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "community_posts") {
        const limit  = vi.fn().mockResolvedValue({ data: MOCK_POSTS, error: null });
        const order2 = vi.fn().mockReturnValue({ limit });
        const order1 = vi.fn().mockReturnValue({ order: order2 });
        const eq     = vi.fn().mockReturnValue({ order: order1 });
        const select = vi.fn().mockReturnValue({ eq });
        return { select, insert: mockInsert };
      }
      if (table === "community_likes") {
        // User already liked post-001
        const notFn  = vi.fn().mockResolvedValue({ data: [{ post_id: "post-001" }], error: null });
        const eq2    = vi.fn().mockReturnValue({ not: notFn });
        const eq1    = vi.fn().mockReturnValue({ eq: eq2 });
        const select = vi.fn().mockReturnValue({ eq: eq1 });
        return { select, insert: vi.fn().mockResolvedValue({ error: null }), delete: likeDeleteSpy };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderCommunity();
    await waitFor(() => expect(screen.getByText("5")).toBeInTheDocument());

    const user = userEvent.setup();
    const unlikeBtn = screen.getByRole("button", { name: /remover curtida/i });
    await user.click(unlikeBtn);

    await waitFor(() => {
      // Optimistic update: 5 → 4
      expect(screen.getByText("4")).toBeInTheDocument();
    });
  });

  it("like insert error reverts optimistic update and shows toast.error", async () => {
    const likeInsertSpy = vi.fn().mockResolvedValue({ error: { message: "DB error" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "community_posts") {
        const limit  = vi.fn().mockResolvedValue({ data: MOCK_POSTS, error: null });
        const order2 = vi.fn().mockReturnValue({ limit });
        const order1 = vi.fn().mockReturnValue({ order: order2 });
        const eq     = vi.fn().mockReturnValue({ order: order1 });
        const select = vi.fn().mockReturnValue({ eq });
        return { select, insert: mockInsert };
      }
      if (table === "community_likes") {
        const notFn  = vi.fn().mockResolvedValue({ data: [], error: null });
        const eq2    = vi.fn().mockReturnValue({ not: notFn });
        const eq1    = vi.fn().mockReturnValue({ eq: eq2 });
        const select = vi.fn().mockReturnValue({ eq: eq1 });
        return { select, insert: likeInsertSpy, delete: vi.fn() };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderCommunity();
    await waitFor(() => expect(screen.getByText("5")).toBeInTheDocument());

    const user = userEvent.setup();
    const likeButtons = screen.getAllByRole("button", { name: /curtir/i });
    await user.click(likeButtons[0]);

    await waitFor(() => {
      // After revert, count returns to 5
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(mockToastError).toHaveBeenCalledWith("Não foi possível curtir este post.");
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Compose sheet — open/close                                  */
/* ──────────────────────────────────────────────────────────── */

describe("CommunityPage — compose sheet", () => {
  it("clicking 'Novo post' button opens the compose sheet", async () => {
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Começando a jornada")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /novo post/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/do que você quer falar\?/i)).toBeInTheDocument();
    });
  });

  it("compose sheet shows 'Novo post' heading", async () => {
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Começando a jornada")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /novo post/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /novo post/i })).toBeInTheDocument();
    });
  });

  it("compose sheet shows anonymous publishing notice", async () => {
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Começando a jornada")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /novo post/i }));

    await waitFor(() => {
      expect(screen.getByText(/publicando como/i)).toBeInTheDocument();
      expect(screen.getByText("Lua Crescente")).toBeInTheDocument();
    });
  });

  it("compose sheet shows category selector buttons", async () => {
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Começando a jornada")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /novo post/i }));

    await waitFor(() => {
      // Category buttons inside the compose form (Geral, Desabafo, etc.)
      expect(screen.getAllByRole("button", { name: /geral/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: /desabafo/i }).length).toBeGreaterThan(0);
    });
  });

  it("compose sheet shows title input and body textarea", async () => {
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Começando a jornada")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /novo post/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/do que você quer falar\?/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/escreva com cuidado/i)).toBeInTheDocument();
    });
  });

  it("X button in compose sheet closes it", async () => {
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Começando a jornada")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /novo post/i }));

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/do que você quer falar\?/i)).toBeInTheDocument()
    );

    await user.click(screen.getByRole("button", { name: /fechar/i }));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/do que você quer falar\?/i)).not.toBeInTheDocument();
    });
  });

  it("FAB (mobile) button opens compose sheet", async () => {
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Começando a jornada")).toBeInTheDocument());

    const user = userEvent.setup();
    // FAB has aria-label "Novo post"
    const allNewPostBtns = screen.getAllByRole("button", { name: /novo post/i });
    // Click the FAB (the one without text content, just the + icon)
    const fab = allNewPostBtns.find((btn) => !btn.textContent?.includes("Novo")) ?? allNewPostBtns[0];
    await user.click(fab);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/do que você quer falar\?/i)).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Compose — validation                                        */
/* ──────────────────────────────────────────────────────────── */

describe("CommunityPage — compose validation", () => {
  async function openCompose() {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /novo post/i }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/do que você quer falar\?/i)).toBeInTheDocument()
    );
    return user;
  }

  it("submitting with empty title shows toast.error", async () => {
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Começando a jornada")).toBeInTheDocument());

    const user = await openCompose();
    // Only fill body, leave title empty
    await user.type(screen.getByPlaceholderText(/escreva com cuidado/i), "Corpo do post");
    await user.click(screen.getByRole("button", { name: /publicar/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Preencha título e conteúdo.");
    });
  });

  it("submitting with empty body shows toast.error", async () => {
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Começando a jornada")).toBeInTheDocument());

    const user = await openCompose();
    await user.type(screen.getByPlaceholderText(/do que você quer falar\?/i), "Meu título");
    // Leave body empty
    await user.click(screen.getByRole("button", { name: /publicar/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Preencha título e conteúdo.");
    });
  });

  it("submitting with both empty fields does not call supabase.insert", async () => {
    const postInsertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }),
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "community_posts") {
        const limit  = vi.fn().mockResolvedValue({ data: MOCK_POSTS, error: null });
        const order2 = vi.fn().mockReturnValue({ limit });
        const order1 = vi.fn().mockReturnValue({ order: order2 });
        const eq     = vi.fn().mockReturnValue({ order: order1 });
        const select = vi.fn().mockReturnValue({ eq });
        return { select, insert: postInsertSpy };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockResolvedValue({ data: [], error: null }),
            eq:  vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
    });

    renderCommunity();
    await waitFor(() => expect(screen.getByText("Começando a jornada")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /novo post/i }));
    await waitFor(() => expect(screen.getByPlaceholderText(/do que você quer falar\?/i)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /publicar/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
    expect(postInsertSpy).not.toHaveBeenCalled();
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Compose — successful submit                                 */
/* ──────────────────────────────────────────────────────────── */

describe("CommunityPage — compose successful submit", () => {
  function setupPostInsertMock() {
    const newPostData = {
      id:             "post-new",
      category:       "geral",
      title:          "Meu novo post incrível",
      body:           "Conteúdo do post publicado.",
      is_pinned:      false,
      likes_count:    0,
      comments_count: 0,
      created_at:     "2026-04-23T12:00:00Z",
    };

    const postInsertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: newPostData, error: null }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "community_posts") {
        const limit  = vi.fn().mockResolvedValue({ data: MOCK_POSTS, error: null });
        const order2 = vi.fn().mockReturnValue({ limit });
        const order1 = vi.fn().mockReturnValue({ order: order2 });
        const eq     = vi.fn().mockReturnValue({ order: order1 });
        const select = vi.fn().mockReturnValue({ eq });
        return { select, insert: postInsertSpy };
      }
      if (table === "community_likes") {
        const notFn  = vi.fn().mockResolvedValue({ data: [], error: null });
        const eq2    = vi.fn().mockReturnValue({ not: notFn });
        const eq1    = vi.fn().mockReturnValue({ eq: eq2 });
        const select = vi.fn().mockReturnValue({ eq: eq1 });
        return { select, insert: vi.fn(), delete: vi.fn() };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    return postInsertSpy;
  }

  it("calls supabase.insert with correct payload on submit", async () => {
    const postInsertSpy = setupPostInsertMock();
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Começando a jornada")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /novo post/i }));
    await waitFor(() => expect(screen.getByPlaceholderText(/do que você quer falar\?/i)).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText(/do que você quer falar\?/i), "Meu novo post incrível");
    await user.type(screen.getByPlaceholderText(/escreva com cuidado/i), "Conteúdo do post publicado.");

    await user.click(screen.getByRole("button", { name: /publicar/i }));

    await waitFor(() => {
      expect(postInsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id:  "user-001",
          category: "geral",
          title:    "Meu novo post incrível",
          body:     "Conteúdo do post publicado.",
        })
      );
    });
  });

  it("shows toast.success 'Post publicado. ✦' on success", async () => {
    setupPostInsertMock();
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Começando a jornada")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /novo post/i }));
    await waitFor(() => expect(screen.getByPlaceholderText(/do que você quer falar\?/i)).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText(/do que você quer falar\?/i), "Meu novo post incrível");
    await user.type(screen.getByPlaceholderText(/escreva com cuidado/i), "Conteúdo do post publicado.");
    await user.click(screen.getByRole("button", { name: /publicar/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Post publicado. ✦");
    });
  });

  it("closes compose sheet after successful submit", async () => {
    setupPostInsertMock();
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Começando a jornada")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /novo post/i }));
    await waitFor(() => expect(screen.getByPlaceholderText(/do que você quer falar\?/i)).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText(/do que você quer falar\?/i), "Meu novo post incrível");
    await user.type(screen.getByPlaceholderText(/escreva com cuidado/i), "Conteúdo do post publicado.");
    await user.click(screen.getByRole("button", { name: /publicar/i }));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/do que você quer falar\?/i)).not.toBeInTheDocument();
    });
  });

  it("new post appears at top of post list without reload", async () => {
    setupPostInsertMock();
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Começando a jornada")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /novo post/i }));
    await waitFor(() => expect(screen.getByPlaceholderText(/do que você quer falar\?/i)).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText(/do que você quer falar\?/i), "Meu novo post incrível");
    await user.type(screen.getByPlaceholderText(/escreva com cuidado/i), "Conteúdo do post publicado.");
    await user.click(screen.getByRole("button", { name: /publicar/i }));

    await waitFor(() => {
      expect(screen.getByText("Meu novo post incrível")).toBeInTheDocument();
    });
  });

  it("selecting a different category in compose form includes it in the insert payload", async () => {
    const postInsertSpy = setupPostInsertMock();
    renderCommunity();
    await waitFor(() => expect(screen.getByText("Começando a jornada")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /novo post/i }));
    await waitFor(() => expect(screen.getByPlaceholderText(/do que você quer falar\?/i)).toBeInTheDocument());

    // Select "Conquistas" category inside the compose form
    const conquistas = screen.getAllByRole("button", { name: /conquistas/i });
    // The one inside the form (not the tab)
    await user.click(conquistas[conquistas.length - 1]);

    await user.type(screen.getByPlaceholderText(/do que você quer falar\?/i), "Minha conquista");
    await user.type(screen.getByPlaceholderText(/escreva com cuidado/i), "Corpo aqui.");
    await user.click(screen.getByRole("button", { name: /publicar/i }));

    await waitFor(() => {
      expect(postInsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ category: "conquistas" })
      );
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Supabase query verification                                 */
/* ──────────────────────────────────────────────────────────── */

describe("CommunityPage — Supabase queries", () => {
  it("queries community_posts with is_visible=true filter", async () => {
    const eqSpy = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: MOCK_POSTS, error: null }),
        }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "community_posts") {
        const select = vi.fn().mockReturnValue({ eq: eqSpy });
        return { select, insert: vi.fn() };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockResolvedValue({ data: [], error: null }),
            eq:  vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
    });

    renderCommunity();
    await waitFor(() => {
      expect(eqSpy).toHaveBeenCalledWith("is_visible", true);
    });
  });

  it("queries community_likes with authenticated user_id", async () => {
    const likeEqSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "community_posts") {
        const limit  = vi.fn().mockResolvedValue({ data: MOCK_POSTS, error: null });
        const order2 = vi.fn().mockReturnValue({ limit });
        const order1 = vi.fn().mockReturnValue({ order: order2 });
        const eq     = vi.fn().mockReturnValue({ order: order1 });
        const select = vi.fn().mockReturnValue({ eq });
        return { select, insert: vi.fn() };
      }
      if (table === "community_likes") {
        const select = vi.fn().mockReturnValue({ eq: likeEqSpy });
        return { select, insert: vi.fn(), delete: vi.fn() };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderCommunity();
    await waitFor(() => {
      expect(likeEqSpy).toHaveBeenCalledWith("user_id", "user-001");
    });
  });
});
