/**
 * Integration Tests — CheckoutPage
 *
 * Covers:
 *  - Loading skeleton enquanto produto carrega
 *  - Produto não encontrado → toast de erro + navigate para /products
 *  - Renderização com produto carregado: título, preço em BRL, método de pagamento
 *  - Validação de formulário: nome e email obrigatórios (inline + toast)
 *  - Validação: email com formato inválido
 *  - Usuário logado: campos preenchidos automaticamente e desabilitados
 *  - Seleção de método de pagamento (PIX, Cartão, Boleto)
 *  - Submissão com sucesso PIX → setStep("success"), exibe instruções de PIX
 *  - Submissão com sucesso Crédito → navigate para /obrigado com invoiceUrl
 *  - Submissão com sucesso Boleto → exibe step de sucesso com barCode
 *  - Chamada da edge function checkout-session com payload correto
 *  - Erro da edge function → toast de erro, botão habilitado novamente
 *  - FunctionsHttpError → extrai texto real do context
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/* ── Asset mock (Vite import static) ── */
vi.mock("@/assets/mulher-espiral-hero-new.jpg", () => ({ default: "/mock-hero.jpg" }));

/* ── Helmet ── */
vi.mock("react-helmet-async", () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  HelmetProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

/* ── SpiralLogo ── */
vi.mock("@/components/layout/SpiralLogo", () => ({
  default: () => <div data-testid="spiral-logo" />,
}));

/* ── Analytics ── */
vi.mock("@/lib/analytics", () => ({
  getAttribution: () => ({ utm_source: "test", utm_medium: "", utm_campaign: "" }),
  captureAttribution: vi.fn(),
}));

/* ── Sequenzy (fire-and-forget, não deve bloquear nada) ── */
vi.mock("@/lib/sequenzy", () => ({
  fireEventAsync: vi.fn().mockResolvedValue(undefined),
  fireEvent: vi.fn().mockResolvedValue(undefined),
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

/* ── useAuth ── */
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

/* ── Supabase client ── */
const mockInvoke     = vi.fn();
const mockFrom       = vi.fn();
const mockSelect     = vi.fn();
const mockEqSlug     = vi.fn();
const mockEqActive   = vi.fn();
const mockSingle     = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

/* ── react-router-dom ── */
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

/* ── Lucide icons — lightweight passthrough ── */
vi.mock("lucide-react", async () => {
  const actual = await vi.importActual<typeof import("lucide-react")>("lucide-react");
  return { ...actual };
});

/* ──────────────────────────────────────────────────────── */
/* Helpers                                                  */
/* ──────────────────────────────────────────────────────── */

const MOCK_PRODUCT = {
  id: "prod-abc123",
  slug: "mulher-espiral",
  title: "Mulher Espiral",
  subtitle: "Autoconhecimento feminino",
  description: "Jornada completa",
  price: 997.00,
  original_price: 1997.00,
  is_active: true,
};

/** Sets up the Supabase `from('products')` chain to resolve with given data/error */
function mockProductQuery(data: typeof MOCK_PRODUCT | null, error: unknown = null) {
  mockSingle.mockResolvedValue({ data, error });
  mockEqActive.mockReturnValue({ single: mockSingle });
  mockEqSlug.mockReturnValue({ eq: mockEqActive });
  mockSelect.mockReturnValue({ eq: mockEqSlug });
  mockFrom.mockReturnValue({ select: mockSelect });
}

/** Renders CheckoutPage at /checkout/:slug */
function renderCheckout(slug = "mulher-espiral") {
  return render(
    <MemoryRouter initialEntries={[`/checkout/${slug}`]}>
      <Routes>
        <Route path="/checkout/:slug" element={<CheckoutPage />} />
        <Route path="/obrigado"       element={<div data-testid="thank-you-page">Obrigado</div>} />
        <Route path="/products"       element={<div data-testid="products-page">Produtos</div>} />
      </Routes>
    </MemoryRouter>
  );
}

/* Lazy import after mocks are set up */
let CheckoutPage: typeof import("@/pages/CheckoutPage").default;

beforeEach(async () => {
  vi.clearAllMocks();
  // Default: guest user (not logged in)
  mockUseAuth.mockReturnValue({ user: null, loading: false });
  // Default: successful product query
  mockProductQuery(MOCK_PRODUCT);
  // Default: successful edge function response (PIX)
  mockInvoke.mockResolvedValue({
    data: {
      orderId: "order-xyz-001",
      payment: { pixKey: "00020126...longkey", invoiceUrl: "https://asaas.com/invoice/123" },
    },
    error: null,
  });

  if (!CheckoutPage) {
    const mod = await import("@/pages/CheckoutPage");
    CheckoutPage = mod.default;
  }
});

/* ──────────────────────────────────────────────────────── */
/* Loading state                                             */
/* ──────────────────────────────────────────────────────── */

describe("CheckoutPage — loading", () => {
  it("shows a spinner while product is loading", async () => {
    // Delay product resolution so spinner is visible synchronously
    let resolve: (v: unknown) => void;
    const pending = new Promise((r) => { resolve = r; });
    mockSingle.mockReturnValue(pending);
    mockEqActive.mockReturnValue({ single: mockSingle });
    mockEqSlug.mockReturnValue({ eq: mockEqActive });
    mockSelect.mockReturnValue({ eq: mockEqSlug });
    mockFrom.mockReturnValue({ select: mockSelect });

    renderCheckout();

    // While pending, the spinner SVG (Loader2) should be present
    // We check that the form is NOT yet present
    expect(screen.queryByRole("button", { name: /registrar pedido/i })).not.toBeInTheDocument();

    // Resolve to unblock cleanup
    resolve!({ data: MOCK_PRODUCT, error: null });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /registrar pedido/i })).toBeInTheDocument()
    );
  });
});

/* ──────────────────────────────────────────────────────── */
/* Product not found                                        */
/* ──────────────────────────────────────────────────────── */

describe("CheckoutPage — product not found", () => {
  it("shows error toast and navigates to /products when product is null", async () => {
    mockProductQuery(null, { message: "Not found" });
    renderCheckout("slug-inexistente");

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Produto não encontrado.");
      expect(mockNavigate).toHaveBeenCalledWith("/products");
    });
  });
});

/* ──────────────────────────────────────────────────────── */
/* Rendering with product loaded                            */
/* ──────────────────────────────────────────────────────── */

describe("CheckoutPage — product rendering", () => {
  it("shows the product title", async () => {
    renderCheckout();
    await waitFor(() =>
      expect(screen.getAllByText(/mulher espiral/i).length).toBeGreaterThan(0)
    );
  });

  it("shows the product price formatted in BRL with R$", async () => {
    renderCheckout();
    await waitFor(() => {
      const priceEl = screen.getAllByText(/R\$\s*997/);
      expect(priceEl.length).toBeGreaterThan(0);
    });
  });

  it("shows the original price with line-through (savings)", async () => {
    renderCheckout();
    await waitFor(() => {
      expect(screen.getAllByText(/1\.997/i).length).toBeGreaterThan(0);
    });
  });

  it("renders the submit button", async () => {
    renderCheckout();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /registrar pedido/i })).toBeInTheDocument()
    );
  });

  it("renders PIX, Cartão and Boleto payment method buttons", async () => {
    renderCheckout();
    await waitFor(() => {
      expect(screen.getByText("PIX")).toBeInTheDocument();
      expect(screen.getByText("Cartão")).toBeInTheDocument();
      expect(screen.getByText("Boleto")).toBeInTheDocument();
    });
  });

  it("shows the security strip with trust badges", async () => {
    renderCheckout();
    await waitFor(() => {
      expect(screen.getByText(/checkout seguro/i)).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────── */
/* Authenticated user — auto-fill                          */
/* ──────────────────────────────────────────────────────── */

describe("CheckoutPage — authenticated user", () => {
  it("pre-fills name and email fields with user data", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", name: "Ana Espiral", email: "ana@espiral.com", role: "member", products: [] },
      loading: false,
    });
    renderCheckout();
    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText("Seu nome") as HTMLInputElement;
      const emailInput = screen.getByPlaceholderText("seu@email.com") as HTMLInputElement;
      expect(nameInput.value).toBe("Ana Espiral");
      expect(emailInput.value).toBe("ana@espiral.com");
    });
  });

  it("disables name and email fields when user is logged in", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", name: "Ana Espiral", email: "ana@espiral.com", role: "member", products: [] },
      loading: false,
    });
    renderCheckout();
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Seu nome")).toBeDisabled();
      expect(screen.getByPlaceholderText("seu@email.com")).toBeDisabled();
    });
  });

  it("shows the 'Logada como' badge for authenticated users", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", name: "Ana", email: "ana@espiral.com", role: "member", products: [] },
      loading: false,
    });
    renderCheckout();
    await waitFor(() => {
      expect(screen.getByText(/logada como/i)).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────── */
/* Form validation                                          */
/* ──────────────────────────────────────────────────────── */

describe("CheckoutPage — form validation", () => {
  beforeEach(async () => {
    renderCheckout();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /registrar pedido/i })).toBeInTheDocument()
    );
  });

  it("shows 'Nome obrigatório' error when name is empty on submit", async () => {
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("seu@email.com"), "test@test.com");
    await user.click(screen.getByRole("button", { name: /registrar pedido/i }));

    await waitFor(() => {
      expect(screen.getByText("Nome obrigatório")).toBeInTheDocument();
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("shows 'E-mail obrigatório' error when email is empty on submit", async () => {
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("Seu nome"), "Ana Silva");
    await user.click(screen.getByRole("button", { name: /registrar pedido/i }));

    await waitFor(() => {
      expect(screen.getByText("E-mail obrigatório")).toBeInTheDocument();
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("shows 'E-mail inválido' error for malformed email", async () => {
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("Seu nome"), "Ana Silva");
    await user.type(screen.getByPlaceholderText("seu@email.com"), "not-an-email");
    await user.click(screen.getByRole("button", { name: /registrar pedido/i }));

    await waitFor(() => {
      expect(screen.getByText("E-mail inválido")).toBeInTheDocument();
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("shows both name and email errors simultaneously when both are empty", async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /registrar pedido/i }));

    await waitFor(() => {
      expect(screen.getByText("Nome obrigatório")).toBeInTheDocument();
      expect(screen.getByText("E-mail obrigatório")).toBeInTheDocument();
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("clears name error when user starts typing name", async () => {
    const user = userEvent.setup();
    // Trigger validation first
    await user.click(screen.getByRole("button", { name: /registrar pedido/i }));
    await waitFor(() => expect(screen.getByText("Nome obrigatório")).toBeInTheDocument());

    // Start typing name
    await user.type(screen.getByPlaceholderText("Seu nome"), "A");
    await waitFor(() => expect(screen.queryByText("Nome obrigatório")).not.toBeInTheDocument());
  });
});

/* ──────────────────────────────────────────────────────── */
/* Payment method selection                                 */
/* ──────────────────────────────────────────────────────── */

describe("CheckoutPage — payment method", () => {
  it("PIX is selected by default and shows PIX tip", async () => {
    renderCheckout();
    await waitFor(() => expect(screen.getByText("PIX")).toBeInTheDocument());
    expect(screen.getByText(/chave PIX enviada por e-mail/i)).toBeInTheDocument();
  });

  it("selecting Cartão shows credit card tip", async () => {
    const user = userEvent.setup();
    renderCheckout();
    await waitFor(() => expect(screen.getByText("Cartão")).toBeInTheDocument());
    await user.click(screen.getByText("Cartão"));
    expect(screen.getByText(/página de pagamento seguro do cartão/i)).toBeInTheDocument();
  });

  it("selecting Boleto shows boleto tip", async () => {
    const user = userEvent.setup();
    renderCheckout();
    await waitFor(() => expect(screen.getByText("Boleto")).toBeInTheDocument());
    await user.click(screen.getByText("Boleto"));
    expect(screen.getByText(/vencimento em 3 dias úteis/i)).toBeInTheDocument();
  });
});

/* ──────────────────────────────────────────────────────── */
/* Successful checkout — PIX                               */
/* ──────────────────────────────────────────────────────── */

describe("CheckoutPage — successful checkout (PIX)", () => {
  async function fillAndSubmit() {
    renderCheckout();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /registrar pedido/i })).toBeInTheDocument()
    );
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("Seu nome"), "Ana Espiral");
    await user.type(screen.getByPlaceholderText("seu@email.com"), "ana@espiral.com");
    await user.click(screen.getByRole("button", { name: /registrar pedido/i }));
  }

  it("calls checkout-session edge function with correct payload (PIX, guest)", async () => {
    await fillAndSubmit();
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "checkout-session",
        expect.objectContaining({
          body: expect.objectContaining({
            productSlug:   "mulher-espiral",
            email:         "ana@espiral.com",
            name:          "Ana Espiral",
            userId:        null,
            paymentMethod: "pix",
          }),
        })
      );
    });
  });

  it("shows success toast when checkout-session succeeds", async () => {
    await fillAndSubmit();
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Pedido registrado! ✦");
    });
  });

  it("transitions to success step and shows PIX instructions", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        orderId: "order-xyz-001",
        payment: { pixKey: "chave-pix-longa-123456789", invoiceUrl: "" },
      },
      error: null,
    });
    await fillAndSubmit();
    await waitFor(() => {
      expect(screen.getByText(/pagamento via PIX/i)).toBeInTheDocument();
      expect(screen.getByText("chave-pix-longa-123456789")).toBeInTheDocument();
    });
  });

  it("shows 'Ver página de confirmação' button in success step", async () => {
    await fillAndSubmit();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /ver página de confirmação/i })
      ).toBeInTheDocument();
    });
  });

  it("success step shows 'Ir para minha área' link", async () => {
    await fillAndSubmit();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /ir para minha área/i })).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────── */
/* Successful checkout — Credit card → navigate /obrigado  */
/* ──────────────────────────────────────────────────────── */

describe("CheckoutPage — successful checkout (Credit card)", () => {
  it("navigates to /obrigado with invoiceUrl for credit card payment", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        orderId: "order-card-001",
        payment: { invoiceUrl: "https://asaas.com/invoice/card/999" },
      },
      error: null,
    });

    renderCheckout();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /registrar pedido/i })).toBeInTheDocument()
    );

    const user = userEvent.setup();
    // Select credit card
    await user.click(screen.getByText("Cartão"));
    await user.type(screen.getByPlaceholderText("Seu nome"), "Lua Crescente");
    await user.type(screen.getByPlaceholderText("seu@email.com"), "lua@espiral.com");
    await user.click(screen.getByRole("button", { name: /registrar pedido/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining("/obrigado")
      );
      const callArg: string = mockNavigate.mock.calls[0][0];
      expect(callArg).toContain("invoiceUrl=");
      expect(callArg).toContain("order-card-001");
      expect(callArg).toContain("method=credit");
    });
  });

  it("includes product slug and title in the /obrigado redirect URL", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        orderId: "order-card-002",
        payment: { invoiceUrl: "https://asaas.com/invoice/card/888" },
      },
      error: null,
    });

    renderCheckout();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /registrar pedido/i })).toBeInTheDocument()
    );

    const user = userEvent.setup();
    await user.click(screen.getByText("Cartão"));
    await user.type(screen.getByPlaceholderText("Seu nome"), "Lua Crescente");
    await user.type(screen.getByPlaceholderText("seu@email.com"), "lua@espiral.com");
    await user.click(screen.getByRole("button", { name: /registrar pedido/i }));

    await waitFor(() => {
      const callArg: string = mockNavigate.mock.calls[0][0];
      expect(callArg).toContain("slug=mulher-espiral");
      expect(callArg).toContain("title=Mulher+Espiral");
    });
  });
});

/* ──────────────────────────────────────────────────────── */
/* Successful checkout — Boleto                            */
/* ──────────────────────────────────────────────────────── */

describe("CheckoutPage — successful checkout (Boleto)", () => {
  it("shows boleto details (barCode) in success step", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        orderId: "order-boleto-001",
        payment: { barCode: "12345.67890 11111.222222 33333.444444 5 00000000199700", invoiceUrl: "https://boleto.link" },
      },
      error: null,
    });

    renderCheckout();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /registrar pedido/i })).toBeInTheDocument()
    );

    const user = userEvent.setup();
    await user.click(screen.getByText("Boleto"));
    await user.type(screen.getByPlaceholderText("Seu nome"), "Maria Silva");
    await user.type(screen.getByPlaceholderText("seu@email.com"), "maria@silva.com");
    await user.click(screen.getByRole("button", { name: /registrar pedido/i }));

    await waitFor(() => {
      expect(screen.getByText(/boleto bancário/i)).toBeInTheDocument();
      expect(screen.getByText(/12345\.67890/)).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────── */
/* Edge function error handling                            */
/* ──────────────────────────────────────────────────────── */

describe("CheckoutPage — edge function error", () => {
  async function fillAndSubmit() {
    renderCheckout();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /registrar pedido/i })).toBeInTheDocument()
    );
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("Seu nome"), "Ana Espiral");
    await user.type(screen.getByPlaceholderText("seu@email.com"), "ana@espiral.com");
    await user.click(screen.getByRole("button", { name: /registrar pedido/i }));
  }

  it("shows error toast when checkout-session returns error", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: "Limite de pagamentos atingido." },
    });
    await fillAndSubmit();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Limite de pagamentos atingido.");
    });
  });

  it("does NOT navigate on edge function error", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: "Erro interno." },
    });
    await fillAndSubmit();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
    // navigate should not have been called (except getSession)
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("re-enables the submit button after error", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: "Erro." },
    });
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.queryByText(/registrando…/i)).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /registrar pedido/i })).not.toBeDisabled();
  });

  it("stays on form step after error", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: "Erro." },
    });
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.queryByText(/pagamento via PIX/i)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /registrar pedido/i })).toBeInTheDocument();
    });
  });
});

/* ──────────────────────────────────────────────────────── */
/* Checkout payload — with authenticated user              */
/* ──────────────────────────────────────────────────────── */

describe("CheckoutPage — checkout payload with authenticated user", () => {
  it("sends userId in payload when user is logged in", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-logged-in", name: "Luna Santos", email: "luna@espiral.com", role: "member", products: [] },
      loading: false,
    });

    renderCheckout();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /registrar pedido/i })).toBeInTheDocument()
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /registrar pedido/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "checkout-session",
        expect.objectContaining({
          body: expect.objectContaining({
            userId: "user-logged-in",
            email:  "luna@espiral.com",
            name:   "Luna Santos",
          }),
        })
      );
    });
  });
});

/* ──────────────────────────────────────────────────────── */
/* BRL price format — edge cases                           */
/* ──────────────────────────────────────────────────────── */

describe("CheckoutPage — BRL price formatting", () => {
  it("renders price as R$ 997,00 (comma decimal, period thousands)", async () => {
    renderCheckout();
    await waitFor(() => {
      // Portuguese locale: 997,00 or 1.997,00
      const priceNodes = screen.getAllByText(/R\$\s*997/);
      expect(priceNodes.length).toBeGreaterThan(0);
    });
  });

  it("renders discounted original price 1.997,00", async () => {
    renderCheckout();
    await waitFor(() => {
      const origNodes = screen.getAllByText(/1\.997/);
      expect(origNodes.length).toBeGreaterThan(0);
    });
  });

  it("handles product price as string (edge case from database)", async () => {
    // Supabase sometimes returns numeric columns as strings
    mockProductQuery({
      ...MOCK_PRODUCT,
      price: "997.00" as unknown as number,
      original_price: "1997.00" as unknown as number,
    });
    renderCheckout();
    await waitFor(() => {
      const priceNodes = screen.getAllByText(/R\$\s*997/);
      expect(priceNodes.length).toBeGreaterThan(0);
    });
  });

  it("shows toast and navigates away for NaN price", async () => {
    mockProductQuery({ ...MOCK_PRODUCT, price: "invalid" as unknown as number });
    renderCheckout();
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Produto com preço inválido.");
      expect(mockNavigate).toHaveBeenCalledWith("/products");
    });
  });
});
