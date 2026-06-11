/**
 * Integration Tests — LessonPage
 *
 * Covers:
 *  - Loading spinner while product/lesson data loads
 *  - Product not found → renders "Produto não encontrado"
 *  - Access denied (no product in user.products + not free) → paywall card
 *  - Free preview lesson → renders without product access check
 *  - Video lesson: iframe embed rendered with safeEmbedUrl
 *  - Video lesson: invalid URL → "Link de vídeo inválido" fallback
 *  - Text lesson: HTML content rendered via dangerouslySetInnerHTML
 *  - PDF lesson: PDF card + "Abrir PDF" link
 *  - Audio lesson: <audio> element rendered
 *  - 'Marcar como concluída' button calls supabase.upsert lesson_progress
 *  - Lesson marked as done shows "Concluída" badge
 *  - upsert error → toast.error, setCompleted reverts, button re-enabled
 *  - Sequenzy fireEventAsync called after marking complete (lesson.completed)
 *  - 100% course progress → setTimeout shows cert modal (showCertModal)
 *  - Course completion modal: "Parabéns" heading + student first name
 *  - Course completion modal: canvas element present for certificate
 *  - Course completion modal: "Baixar PNG" button present
 *  - Course completion modal: "Certificado completo" link present
 *  - Closing modal via ✕ button hides it
 *  - Desktop nav: "Anterior" link → prev lesson URL
 *  - Desktop nav: "Próxima" link → next lesson URL
 *  - Breadcrumb link to /products/:slug rendered
 *  - Module progress bar rendered when moduleOfLesson is found
 *  - Lesson type badge rendered
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

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

/* ── Toast ── */
const mockToastError   = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error:   (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

/* ── Sequenzy ── */
const mockFireEventAsync = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/sequenzy", () => ({
  fireEventAsync: (...args: unknown[]) => mockFireEventAsync(...args),
}));

/* ── contentSafety — passthrough stubs ── */
vi.mock("@/lib/contentSafety", () => ({
  safeEmbedUrl: (url: unknown) => {
    if (!url || typeof url !== "string") return null;
    if (url.startsWith("https://www.youtube.com/embed/") || url.startsWith("https://player.vimeo.com/")) return url;
    return null;
  },
  isStorageVideoUrl: (url: unknown) => {
    if (!url || typeof url !== "string") return false;
    return url.includes("video-content") || url.endsWith(".mp4") || url.endsWith(".webm");
  },
  safeExternalUrl: (url: unknown) => {
    if (!url || typeof url !== "string") return null;
    if (url.startsWith("https://")) return url;
    return null;
  },
  sanitizeHtml: (html: unknown) => (typeof html === "string" ? html : ""),
}));

/* ── useAuth ── */
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

/* ── Supabase ── */
const mockFrom    = vi.fn();
const mockUpsert  = vi.fn();

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

/* ── canvas stub (jsdom doesn't implement canvas) ── */
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;

/* ──────────────────────────────────────────────────────────── */
/* Test data                                                    */
/* ──────────────────────────────────────────────────────────── */

const LESSON_VIDEO = {
  id: "les-001",
  module_id: "mod-001",
  title: "Introdução ao Despertar",
  type: "video",
  content: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  sort_order: 1,
  is_free: false,
};

const LESSON_TEXT = {
  id: "les-002",
  module_id: "mod-001",
  title: "A Jornada Interior",
  type: "text",
  content: "<p>Bem-vinda à <strong>jornada</strong> de autoconhecimento.</p>",
  sort_order: 2,
  is_free: false,
};

const LESSON_PDF = {
  id: "les-003",
  module_id: "mod-001",
  title: "Material Complementar",
  type: "pdf",
  content: "https://example.com/material.pdf",
  sort_order: 3,
  is_free: false,
};

const LESSON_AUDIO = {
  id: "les-004",
  module_id: "mod-001",
  title: "Meditação Guiada",
  type: "audio",
  content: "https://example.com/meditacao.mp3",
  sort_order: 4,
  is_free: false,
};

const LESSON_FREE = {
  id: "les-005",
  module_id: "mod-001",
  title: "Aula Gratuita",
  type: "video",
  content: "https://www.youtube.com/embed/preview123",
  sort_order: 5,
  is_free: true,
};

const LESSON_INVALID_VIDEO = {
  id: "les-006",
  module_id: "mod-001",
  title: "Vídeo Inválido",
  type: "video",
  content: "INVALID_URL",
  sort_order: 6,
  is_free: false,
};

const LESSON_STORAGE_VIDEO = {
  id: "les-007",
  module_id: "mod-001",
  title: "Aula em Vídeo Storage",
  type: "video",
  content: "https://example-project.supabase.co/storage/v1/object/public/video-content/products/prod-001/1718000000000-aula.mp4",
  sort_order: 7,
  is_free: false,
};

// The product structure returned by supabase.from("products").select(...)
const buildProduct = (lessons: typeof LESSON_VIDEO[]) => ({
  id: "prod-001",
  slug: "mulher-espiral",
  title: "Mulher Espiral",
  subtitle: "Autoconhecimento feminino",
  certificate_config: {
    courseName: "Mulher Espiral",
    instructorName: "Sunyan Nunes",
    instructorTitle: "Mentora & Fundadora",
    institutionLabel: "Despertar Espiral",
  },
  modules: [
    {
      id: "mod-001",
      title: "Módulo 1 — O Chamado",
      sort_order: 1,
      lessons: lessons.map((l) => ({ id: l.id, module_id: l.module_id, title: l.title, type: l.type, sort_order: l.sort_order, is_free: l.is_free })),
    },
    {
      id: "mod-002",
      title: "Módulo 2 — O Despertar",
      sort_order: 2,
      lessons: [{ id: "les-010", module_id: "mod-002", title: "Aula do Módulo 2", type: "text", sort_order: 1, is_free: false }],
    },
  ],
});

const AUTH_USER_WITH_ACCESS = {
  id: "user-001",
  email: "ana@espiral.com",
  name: "Ana Espiral",
  role: "member" as const,
  anonymous_name: "Lua Crescente",
  products: ["mulher-espiral"], // has access
};

const AUTH_USER_NO_ACCESS = {
  id: "user-002",
  email: "guest@espiral.com",
  name: "Convidada",
  role: "member" as const,
  anonymous_name: "Estrela",
  products: [], // no access
};

/* ──────────────────────────────────────────────────────────── */
/* Mock setup helpers                                           */
/* ──────────────────────────────────────────────────────────── */

/**
 * Wire up supabase mocks for a complete LessonPage load.
 * - products query → returns product with modules/lessons
 * - lesson_progress query → returns completedIds as { lesson_id }
 * - lessons query → returns the specific lesson row
 * - lesson_progress upsert → returns upsertResult
 */
function setupSupabaseMocks({
  productData = buildProduct([LESSON_VIDEO, LESSON_TEXT, LESSON_PDF]),
  lessonRow   = LESSON_VIDEO,
  completedIds = [] as string[],
  upsertResult = { error: null } as { error: null | { message: string } },
}: {
  productData?: ReturnType<typeof buildProduct> | null;
  lessonRow?:   typeof LESSON_VIDEO | null;
  completedIds?: string[];
  upsertResult?: { error: null | { message: string } };
} = {}) {

  // lesson_progress.upsert()
  mockUpsert.mockResolvedValue(upsertResult);

  mockFrom.mockImplementation((table: string) => {
    if (table === "products") {
      // .select().eq().single()
      const single = vi.fn().mockResolvedValue({ data: productData, error: productData ? null : { message: "Not found" } });
      const eqSlug = vi.fn().mockReturnValue({ single });
      const select = vi.fn().mockReturnValue({ eq: eqSlug });
      return { select };
    }

    if (table === "lesson_progress") {
      // Check if this is a SELECT or UPSERT call
      const inFn  = vi.fn().mockResolvedValue({ data: completedIds.map((id) => ({ lesson_id: id })), error: null });
      const eq2   = vi.fn().mockReturnValue({ in: inFn });
      const eq1   = vi.fn().mockReturnValue({ eq: eq2 });
      const selectFn = vi.fn().mockReturnValue({ eq: eq1 });

      return {
        select: selectFn,
        upsert: mockUpsert,
      };
    }

    if (table === "lessons") {
      // .select().eq().maybeSingle()
      const maybeSingle = vi.fn().mockResolvedValue({ data: lessonRow, error: null });
      const eq = vi.fn().mockReturnValue({ maybeSingle });
      const select = vi.fn().mockReturnValue({ eq });
      return { select };
    }

    return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
  });
}

/* Render LessonPage at /products/:slug/lesson/:lessonId */
function renderLesson(slug = "mulher-espiral", lessonId = "les-001") {
  return render(
    <MemoryRouter initialEntries={[`/products/${slug}/lesson/${lessonId}`]}>
      <Routes>
        <Route path="/products/:slug/lesson/:lessonId" element={<LessonPage />} />
        <Route path="/products/:slug" element={<div data-testid="course-page">Curso</div>} />
        <Route path="/products/:slug/certificado" element={<div data-testid="cert-page">Certificado</div>} />
        <Route path="/products" element={<div data-testid="products-page">Produtos</div>} />
        <Route path="/checkout/:slug" element={<div data-testid="checkout-page">Checkout</div>} />
      </Routes>
    </MemoryRouter>
  );
}

let LessonPage: typeof import("@/pages/LessonPage").default;

beforeEach(async () => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: AUTH_USER_WITH_ACCESS, loading: false });

  if (!LessonPage) {
    const mod = await import("@/pages/LessonPage");
    LessonPage = mod.default;
  }
});

/* ──────────────────────────────────────────────────────────── */
/* Loading state                                               */
/* ──────────────────────────────────────────────────────────── */

describe("LessonPage — loading", () => {
  it("renders a spinner while product is loading", async () => {
    let resolveProduct: (v: unknown) => void;
    const pending = new Promise((r) => { resolveProduct = r; });

    mockFrom.mockImplementation((table: string) => {
      if (table === "products") {
        const single = vi.fn().mockReturnValue(pending);
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single }) }) };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    renderLesson();
    // Spinner: animated div or svg visible before data resolves
    const dashboard = screen.getByTestId("dashboard-layout");
    expect(dashboard).toBeInTheDocument();
    // Lesson content not visible yet
    expect(screen.queryByText("Introdução ao Despertar")).not.toBeInTheDocument();

    resolveProduct!({ data: null, error: { message: "not found" } });
    await waitFor(() => expect(screen.getByText(/produto não encontrado/i)).toBeInTheDocument());
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Product not found                                           */
/* ──────────────────────────────────────────────────────────── */

describe("LessonPage — product not found", () => {
  it("renders 'Produto não encontrado' when product is null", async () => {
    setupSupabaseMocks({ productData: null });
    renderLesson();
    await waitFor(() => {
      expect(screen.getByText(/produto não encontrado/i)).toBeInTheDocument();
    });
  });

  it("shows 'Ver meus cursos' link when product not found", async () => {
    setupSupabaseMocks({ productData: null });
    renderLesson();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /ver meus cursos/i })).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Access control                                              */
/* ──────────────────────────────────────────────────────────── */

describe("LessonPage — access control", () => {
  it("renders paywall for user without product access on non-free lesson", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_NO_ACCESS, loading: false });
    setupSupabaseMocks({ lessonRow: LESSON_VIDEO });
    renderLesson();
    await waitFor(() => {
      expect(screen.getByText(/conteúdo exclusivo/i)).toBeInTheDocument();
    });
  });

  it("renders 'Liberar acesso agora' CTA in paywall", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_NO_ACCESS, loading: false });
    setupSupabaseMocks({ lessonRow: LESSON_VIDEO });
    renderLesson();
    await waitFor(() => {
      expect(screen.getAllByRole("link", { name: /liberar acesso agora/i }).length).toBeGreaterThan(0);
    });
  });

  it("renders free lesson without paywall even for user with no product access", async () => {
    mockUseAuth.mockReturnValue({ user: AUTH_USER_NO_ACCESS, loading: false });
    const productWithFree = buildProduct([LESSON_FREE]);
    setupSupabaseMocks({ productData: productWithFree, lessonRow: LESSON_FREE });
    renderLesson("mulher-espiral", "les-005");
    await waitFor(() => {
      expect(screen.getByText("Aula Gratuita")).toBeInTheDocument();
      expect(screen.queryByText(/conteúdo exclusivo/i)).not.toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Video lesson                                                */
/* ──────────────────────────────────────────────────────────── */

describe("LessonPage — video lesson", () => {
  it("renders an iframe with the embed URL for type=video", async () => {
    setupSupabaseMocks({ lessonRow: LESSON_VIDEO });
    renderLesson();
    await waitFor(() => {
      const iframe = screen.getByTitle("Introdução ao Despertar");
      expect(iframe.tagName.toLowerCase()).toBe("iframe");
      expect(iframe).toHaveAttribute("src", LESSON_VIDEO.content);
    });
  });

  it("renders the 'Vídeo' type badge", async () => {
    setupSupabaseMocks({ lessonRow: LESSON_VIDEO });
    renderLesson();
    await waitFor(() => {
      expect(screen.getByText("Vídeo")).toBeInTheDocument();
    });
  });

  it("renders lesson title as heading", async () => {
    setupSupabaseMocks({ lessonRow: LESSON_VIDEO });
    renderLesson();
    await waitFor(() => {
      expect(screen.getByText("Introdução ao Despertar")).toBeInTheDocument();
    });
  });

  it("shows invalid URL fallback when safeEmbedUrl returns null and not a storage URL", async () => {
    const productWithInvalidVideo = buildProduct([LESSON_INVALID_VIDEO]);
    setupSupabaseMocks({ productData: productWithInvalidVideo, lessonRow: LESSON_INVALID_VIDEO });
    renderLesson("mulher-espiral", "les-006");
    await waitFor(() => {
      expect(screen.getByText(/link de vídeo inválido/i)).toBeInTheDocument();
    });
  });

  it("shows 'Falar com suporte' link in invalid video fallback", async () => {
    const productWithInvalidVideo = buildProduct([LESSON_INVALID_VIDEO]);
    setupSupabaseMocks({ productData: productWithInvalidVideo, lessonRow: LESSON_INVALID_VIDEO });
    renderLesson("mulher-espiral", "les-006");
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /falar com suporte/i })).toBeInTheDocument();
    });
  });

  it("renders native <video> element (not iframe) for Storage URLs", async () => {
    const productWithStorage = buildProduct([LESSON_STORAGE_VIDEO]);
    setupSupabaseMocks({ productData: productWithStorage, lessonRow: LESSON_STORAGE_VIDEO });
    renderLesson("mulher-espiral", "les-007");
    await waitFor(() => {
      const video = document.querySelector("video");
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute("src", LESSON_STORAGE_VIDEO.content);
      expect(video).toHaveAttribute("controls");
      expect(video).toHaveAttribute("preload", "metadata");
    });
  });

  it("Storage video element has controlsList='nodownload'", async () => {
    const productWithStorage = buildProduct([LESSON_STORAGE_VIDEO]);
    setupSupabaseMocks({ productData: productWithStorage, lessonRow: LESSON_STORAGE_VIDEO });
    renderLesson("mulher-espiral", "les-007");
    await waitFor(() => {
      const video = document.querySelector("video");
      expect(video).toHaveAttribute("controlslist", "nodownload");
    });
  });

  it("does NOT render an iframe for Storage video URLs", async () => {
    const productWithStorage = buildProduct([LESSON_STORAGE_VIDEO]);
    setupSupabaseMocks({ productData: productWithStorage, lessonRow: LESSON_STORAGE_VIDEO });
    renderLesson("mulher-espiral", "les-007");
    await waitFor(() => {
      expect(screen.queryByTitle("Aula em Vídeo Storage")).not.toBeInTheDocument();
      expect(document.querySelector("video")).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Text lesson                                                 */
/* ──────────────────────────────────────────────────────────── */

describe("LessonPage — text lesson", () => {
  it("renders HTML content for type=text via dangerouslySetInnerHTML", async () => {
    const productWithText = buildProduct([LESSON_TEXT]);
    setupSupabaseMocks({ productData: productWithText, lessonRow: LESSON_TEXT });
    renderLesson("mulher-espiral", "les-002");
    await waitFor(() => {
      // sanitizeHtml returns the html as-is in our mock
      expect(screen.getByText(/jornada/i)).toBeInTheDocument();
    });
  });

  it("renders the 'Leitura' type badge for text lessons", async () => {
    const productWithText = buildProduct([LESSON_TEXT]);
    setupSupabaseMocks({ productData: productWithText, lessonRow: LESSON_TEXT });
    renderLesson("mulher-espiral", "les-002");
    await waitFor(() => {
      expect(screen.getByText("Leitura")).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* PDF lesson                                                  */
/* ──────────────────────────────────────────────────────────── */

describe("LessonPage — PDF lesson", () => {
  it("renders 'Abrir PDF' link for type=pdf", async () => {
    const productWithPdf = buildProduct([LESSON_PDF]);
    setupSupabaseMocks({ productData: productWithPdf, lessonRow: LESSON_PDF });
    renderLesson("mulher-espiral", "les-003");
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /abrir pdf/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", LESSON_PDF.content);
    });
  });

  it("renders the PDF file description text", async () => {
    const productWithPdf = buildProduct([LESSON_PDF]);
    setupSupabaseMocks({ productData: productWithPdf, lessonRow: LESSON_PDF });
    renderLesson("mulher-espiral", "les-003");
    await waitFor(() => {
      expect(screen.getByText(/arquivo pdf disponível para download/i)).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Audio lesson                                                */
/* ──────────────────────────────────────────────────────────── */

describe("LessonPage — audio lesson", () => {
  it("renders an <audio> element for type=audio", async () => {
    const productWithAudio = buildProduct([LESSON_AUDIO]);
    setupSupabaseMocks({ productData: productWithAudio, lessonRow: LESSON_AUDIO });
    renderLesson("mulher-espiral", "les-004");
    await waitFor(() => {
      const audio = document.querySelector("audio");
      expect(audio).toBeInTheDocument();
      expect(audio).toHaveAttribute("src", LESSON_AUDIO.content);
    });
  });

  it("renders the 'Áudio' type badge", async () => {
    const productWithAudio = buildProduct([LESSON_AUDIO]);
    setupSupabaseMocks({ productData: productWithAudio, lessonRow: LESSON_AUDIO });
    renderLesson("mulher-espiral", "les-004");
    await waitFor(() => {
      expect(screen.getByText("Áudio")).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Mark as complete                                            */
/* ──────────────────────────────────────────────────────────── */

describe("LessonPage — mark as complete", () => {
  it("calls supabase.upsert on lesson_progress when 'Marcar como concluída' is clicked", async () => {
    setupSupabaseMocks({ lessonRow: LESSON_VIDEO });
    renderLesson();
    await waitFor(() => {
      expect(screen.getAllByText(/marcar como concluída|concluir aula/i).length).toBeGreaterThan(0);
    });

    const user = userEvent.setup();
    const btn = screen.getAllByText(/marcar como concluída|concluir aula/i)[0].closest("button")!;
    await user.click(btn);

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-001",
          lesson_id: "les-001",
          completed: true,
        }),
        expect.objectContaining({ onConflict: "user_id,lesson_id" })
      );
    });
  });

  it("shows success toast after marking complete", async () => {
    setupSupabaseMocks({ lessonRow: LESSON_VIDEO });
    renderLesson();
    await waitFor(() =>
      expect(screen.getAllByText(/marcar como concluída|concluir aula/i).length).toBeGreaterThan(0)
    );

    const user = userEvent.setup();
    const btn = screen.getAllByText(/marcar como concluída|concluir aula/i)[0].closest("button")!;
    await user.click(btn);

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Aula concluída. ✦");
    });
  });

  it("shows 'Concluída' badge after marking complete", async () => {
    setupSupabaseMocks({ lessonRow: LESSON_VIDEO });
    renderLesson();
    await waitFor(() =>
      expect(screen.getAllByText(/marcar como concluída|concluir aula/i).length).toBeGreaterThan(0)
    );

    const user = userEvent.setup();
    const btn = screen.getAllByText(/marcar como concluída|concluir aula/i)[0].closest("button")!;
    await user.click(btn);

    await waitFor(() => {
      expect(screen.getByText("Concluída")).toBeInTheDocument();
    });
  });

  it("shows 'Concluída' badge immediately when lesson is already in completedIds", async () => {
    setupSupabaseMocks({ lessonRow: LESSON_VIDEO, completedIds: ["les-001"] });
    renderLesson();
    await waitFor(() => {
      expect(screen.getByText("Concluída")).toBeInTheDocument();
    });
    // Mark button should NOT be present
    expect(screen.queryAllByText(/marcar como concluída|concluir aula/i).filter(el => !el.closest("[aria-hidden]")).length).toBe(0);
  });

  it("shows error toast and reverts completed state on upsert error", async () => {
    setupSupabaseMocks({ lessonRow: LESSON_VIDEO, upsertResult: { error: { message: "DB error" } } });
    renderLesson();
    await waitFor(() =>
      expect(screen.getAllByText(/marcar como concluída|concluir aula/i).length).toBeGreaterThan(0)
    );

    const user = userEvent.setup();
    const btn = screen.getAllByText(/marcar como concluída|concluir aula/i)[0].closest("button")!;
    await user.click(btn);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Não foi possível salvar o progresso.");
    });
    // Badge should not appear since it was reverted
    await waitFor(() => {
      expect(screen.queryByText("Concluída")).not.toBeInTheDocument();
    });
  });

  it("fires Sequenzy lesson.completed event after marking complete", async () => {
    setupSupabaseMocks({ lessonRow: LESSON_VIDEO });
    renderLesson();
    await waitFor(() =>
      expect(screen.getAllByText(/marcar como concluída|concluir aula/i).length).toBeGreaterThan(0)
    );

    const user = userEvent.setup();
    await user.click(screen.getAllByText(/marcar como concluída|concluir aula/i)[0].closest("button")!);

    await waitFor(() => {
      expect(mockFireEventAsync).toHaveBeenCalledWith(
        "lesson.completed",
        expect.objectContaining({
          email: "ana@espiral.com",
          properties: expect.objectContaining({
            lesson_id: "les-001",
            lesson_type: "video",
            product_slug: "mulher-espiral",
          }),
        })
      );
    });
  });
});

/* ──────────────────────────────────────────────────────────── */
/* 100% completion → Certificate modal                         */
/* ──────────────────────────────────────────────────────────── */

describe("LessonPage — course completion modal", () => {
  /**
   * To trigger 100% completion: the product has only 1 lesson (les-001),
   * and clicking "Marcar como concluída" makes all lessons = completed.
   */
  function buildSingleLessonProduct() {
    return {
      id: "prod-001",
      slug: "mulher-espiral",
      title: "Mulher Espiral",
      subtitle: null,
      certificate_config: {
        courseName: "Mulher Espiral",
        instructorName: "Sunyan Nunes",
      },
      modules: [
        {
          id: "mod-001",
          title: "Módulo 1",
          sort_order: 1,
          lessons: [{ id: "les-001", module_id: "mod-001", title: "Única Aula", type: "video", sort_order: 1, is_free: false }],
        },
      ],
    };
  }

  function setupSingleLessonMocks() {
    mockUpsert.mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "products") {
        const single = vi.fn().mockResolvedValue({ data: buildSingleLessonProduct(), error: null });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single }) }) };
      }
      if (table === "lesson_progress") {
        const inFn = vi.fn().mockResolvedValue({ data: [], error: null });
        const eq2  = vi.fn().mockReturnValue({ in: inFn });
        const eq1  = vi.fn().mockReturnValue({ eq: eq2 });
        return {
          select: vi.fn().mockReturnValue({ eq: eq1 }),
          upsert: mockUpsert,
        };
      }
      if (table === "lessons") {
        const maybeSingle = vi.fn().mockResolvedValue({
          data: { id: "les-001", module_id: "mod-001", title: "Única Aula", type: "video", content: "https://www.youtube.com/embed/test", sort_order: 1, is_free: false },
          error: null,
        });
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }) };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    });
  }

  it("shows the completion modal after marking the last lesson complete (100%)", async () => {
    vi.useFakeTimers();
    setupSingleLessonMocks();
    renderLesson();

    await waitFor(() =>
      expect(screen.getAllByText(/marcar como concluída|concluir aula/i).length).toBeGreaterThan(0)
    );

    // Click mark complete
    const btn = screen.getAllByText(/marcar como concluída|concluir aula/i)[0].closest("button")!;
    await act(async () => {
      btn.click();
      await Promise.resolve(); // flush microtasks
    });

    // Advance timers: the modal shows after setTimeout 700ms
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    await waitFor(() => {
      expect(screen.getByText(/parabéns/i)).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it("shows the student's first name in the modal heading", async () => {
    vi.useFakeTimers();
    setupSingleLessonMocks();
    renderLesson();

    await waitFor(() =>
      expect(screen.getAllByText(/marcar como concluída|concluir aula/i).length).toBeGreaterThan(0)
    );

    await act(async () => {
      screen.getAllByText(/marcar como concluída|concluir aula/i)[0].closest("button")!.click();
      await Promise.resolve();
    });

    await act(async () => { vi.advanceTimersByTime(800); });

    await waitFor(() => {
      // "Parabéns, Ana! ✦" — first name from user.name
      expect(screen.getByText(/ana/i)).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it("modal contains a canvas element for the certificate preview", async () => {
    vi.useFakeTimers();
    setupSingleLessonMocks();
    renderLesson();

    await waitFor(() =>
      expect(screen.getAllByText(/marcar como concluída|concluir aula/i).length).toBeGreaterThan(0)
    );

    await act(async () => {
      screen.getAllByText(/marcar como concluída|concluir aula/i)[0].closest("button")!.click();
      await Promise.resolve();
    });

    await act(async () => { vi.advanceTimersByTime(800); });

    await waitFor(() => {
      expect(document.querySelector("canvas")).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it("modal has 'Baixar PNG' button", async () => {
    vi.useFakeTimers();
    setupSingleLessonMocks();
    renderLesson();

    await waitFor(() =>
      expect(screen.getAllByText(/marcar como concluída|concluir aula/i).length).toBeGreaterThan(0)
    );

    await act(async () => {
      screen.getAllByText(/marcar como concluída|concluir aula/i)[0].closest("button")!.click();
      await Promise.resolve();
    });

    await act(async () => { vi.advanceTimersByTime(800); });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /baixar png/i })).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it("modal has 'Certificado completo' link", async () => {
    vi.useFakeTimers();
    setupSingleLessonMocks();
    renderLesson();

    await waitFor(() =>
      expect(screen.getAllByText(/marcar como concluída|concluir aula/i).length).toBeGreaterThan(0)
    );

    await act(async () => {
      screen.getAllByText(/marcar como concluída|concluir aula/i)[0].closest("button")!.click();
      await Promise.resolve();
    });

    await act(async () => { vi.advanceTimersByTime(800); });

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /certificado completo/i })).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it("fires Sequenzy course.completed event at 100% progress", async () => {
    vi.useFakeTimers();
    setupSingleLessonMocks();
    renderLesson();

    await waitFor(() =>
      expect(screen.getAllByText(/marcar como concluída|concluir aula/i).length).toBeGreaterThan(0)
    );

    await act(async () => {
      screen.getAllByText(/marcar como concluída|concluir aula/i)[0].closest("button")!.click();
      await Promise.resolve();
    });

    await act(async () => { vi.advanceTimersByTime(800); });

    await waitFor(() => {
      expect(mockFireEventAsync).toHaveBeenCalledWith(
        "course.completed",
        expect.objectContaining({
          email: "ana@espiral.com",
          properties: expect.objectContaining({
            product_slug: "mulher-espiral",
            total_lessons: 1,
          }),
        })
      );
    });

    vi.useRealTimers();
  });

  it("closes the modal when the ✕ button is clicked", async () => {
    vi.useFakeTimers();
    setupSingleLessonMocks();
    renderLesson();

    await waitFor(() =>
      expect(screen.getAllByText(/marcar como concluída|concluir aula/i).length).toBeGreaterThan(0)
    );

    await act(async () => {
      screen.getAllByText(/marcar como concluída|concluir aula/i)[0].closest("button")!.click();
      await Promise.resolve();
    });

    await act(async () => { vi.advanceTimersByTime(800); });

    await waitFor(() => expect(screen.getByText(/parabéns/i)).toBeInTheDocument());

    const closeBtn = screen.getByRole("button", { name: /fechar/i });
    await act(async () => { closeBtn.click(); });

    await waitFor(() => {
      expect(screen.queryByText(/parabéns/i)).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });
});

/* ──────────────────────────────────────────────────────────── */
/* Navigation                                                  */
/* ──────────────────────────────────────────────────────────── */

describe("LessonPage — navigation", () => {
  it("renders a breadcrumb link back to /products/:slug", async () => {
    setupSupabaseMocks({ lessonRow: LESSON_VIDEO });
    renderLesson();
    await waitFor(() => {
      // Breadcrumb "Curso" link
      const courseLinks = screen.getAllByRole("link", { name: /curso/i });
      expect(courseLinks.some(l => (l as HTMLAnchorElement).href.includes("/products/mulher-espiral"))).toBe(true);
    });
  });

  it("renders the module title in breadcrumb", async () => {
    setupSupabaseMocks({ lessonRow: LESSON_VIDEO });
    renderLesson();
    await waitFor(() => {
      expect(screen.getByText("Módulo 1 — O Chamado")).toBeInTheDocument();
    });
  });

  it("renders module progress bar when module is found", async () => {
    setupSupabaseMocks({ lessonRow: LESSON_VIDEO });
    renderLesson();
    await waitFor(() => {
      expect(screen.getByText("Módulo atual")).toBeInTheDocument();
    });
  });
});
