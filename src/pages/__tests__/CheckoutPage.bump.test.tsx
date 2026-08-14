/**
 * Integration Tests — CheckoutPage · bump de R$ 27
 * Arquivo separado de propósito: CheckoutPage.test.tsx tem casos verdes e
 * não deve ser tocado.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { BUMP_SLUG } from "@/lib/bump";

/* ── Asset mock (Vite import static) — copiado de CheckoutPage.test.tsx:25 ── */
vi.mock("@/assets/mulher-espiral-hero-new.jpg", () => ({ default: "/mock-hero.jpg" }));

/* ── Helmet — copiado de CheckoutPage.test.tsx:28-31 ── */
vi.mock("react-helmet-async", () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  HelmetProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

/* ── SpiralLogo — copiado de CheckoutPage.test.tsx:34-36 ── */
vi.mock("@/components/layout/SpiralLogo", () => ({
  default: () => <div data-testid="spiral-logo" />,
}));

/* ── Analytics — copiado de CheckoutPage.test.tsx:39-42 ── */
vi.mock("@/lib/analytics", () => ({
  getAttribution: () => ({ utm_source: "test", utm_medium: "", utm_campaign: "" }),
  captureAttribution: vi.fn(),
}));

/* ── Sequenzy (fire-and-forget) — copiado de CheckoutPage.test.tsx:45-48 ── */
vi.mock("@/lib/sequenzy", () => ({
  fireEventAsync: vi.fn().mockResolvedValue(undefined),
  fireEvent: vi.fn().mockResolvedValue(undefined),
}));

/* ── Toast — copiado de CheckoutPage.test.tsx:51-58 ── */
const mockToastError   = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error:   (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

/* ── useAuth — copiado de CheckoutPage.test.tsx:61-64 ── */
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

/* ──────────────────────────────────────────────────────────────────────
 * Supabase mock — NÃO é o esqueleto do brief.
 *
 * O brief supunha `.eq().eq().maybeSingle()`/`.single()` (2 níveis fixos).
 * A CheckoutPage real encadeia TRÊS `.eq()` na busca do produto principal
 * (`slug`, `is_active`, `status`) antes de `.single()`, e UM `.eq()` na
 * busca do bump antes de `.maybeSingle()`. Em vez de fixar a profundidade,
 * o nó da cadeia se retorna a si mesmo em `.eq()` — suporta qualquer
 * quantidade de `.eq()` e termina em `.single()` OU `.maybeSingle()`. Só o
 * valor do PRIMEIRO `.eq("slug", val)` decide qual produto volta.
 * ────────────────────────────────────────────────────────────────────── */

const PRODUTO = {
  id: "p-1", slug: "sete-manhas", title: "Sete Manhãs", price: 47,
  is_active: true, status: "disponivel",
};
const BUMP_DISPONIVEL = {
  id: "b-1", slug: BUMP_SLUG, title: "Mapa dos Sentimentos que Aprisionam",
  price: 27, is_active: true, status: "disponivel",
};

let bumpNoBanco: Record<string, unknown> | null = BUMP_DISPONIVEL;
const mockInvoke = vi.fn().mockResolvedValue({ data: { orderId: "o-1" }, error: null });

/**
 * A busca do bump agora roda num efeito PRÓPRIO, desacoplada do carregamento
 * do produto principal (correção do Important 1 da revisão — antes, uma
 * busca de bump lenta segurava o spinner da pagina inteira). Isso significa
 * que "Finalizar pedido" pode aparecer ANTES da busca do bump resolver, e um
 * `queryByLabelText(...).not.toBeInTheDocument()` logo em seguida provaria
 * pouco: passaria mesmo que a caixa fosse aparecer um tick depois.
 * `bumpFetchResolved` conta quantas vezes a query do bump (a que termina em
 * `.maybeSingle()`, sempre com slug === BUMP_SLUG) realmente resolveu — os
 * testes de ausência esperam esse sinal positivo antes de confiar no
 * `not.toBeInTheDocument()`.
 */
let bumpFetchResolved = 0;

function buildChainNode(slugVal: string) {
  const node = {
    eq: (_col: string, _val?: string) => node,
    single: async () => ({
      data: slugVal === BUMP_SLUG ? bumpNoBanco : PRODUTO, error: null,
    }),
    maybeSingle: async () => {
      const data = slugVal === BUMP_SLUG ? bumpNoBanco : PRODUTO;
      if (slugVal === BUMP_SLUG) bumpFetchResolved += 1;
      return { data, error: null };
    },
  };
  return node;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: (_col: string, val: string) => buildChainNode(val),
      }),
    }),
    functions: { invoke: (...a: unknown[]) => mockInvoke(...a) },
  },
}));

import CheckoutPage from "@/pages/CheckoutPage";

function renderCheckout(slug = "sete-manhas") {
  return render(
    <MemoryRouter initialEntries={[`/checkout/${slug}`]}>
      <Routes><Route path="/checkout/:slug" element={<CheckoutPage />} /></Routes>
    </MemoryRouter>
  );
}

/**
 * `data-testid="checkout-total"` existe DUAS vezes no DOM: o resumo mobile
 * (compacto) e o desktop são renderizados ao mesmo tempo em jsdom — só CSS
 * (`lg:hidden` / `hidden lg:block`) decide qual aparece visualmente, e jsdom
 * não computa media query. `getByTestId` (singular) do esqueleto do brief
 * quebraria com "multiple elements found"; usamos `getAllByTestId` e
 * conferimos as duas instâncias.
 */
function totals() {
  return screen.getAllByTestId("checkout-total");
}

async function fillNomeEmail(user: ReturnType<typeof userEvent.setup>) {
  // getByLabelText não serve aqui: os campos de nome/e-mail usam <label>
  // solto, sem htmlFor/id (ver CheckoutPage.tsx:435-444) — o mesmo motivo
  // pelo qual CheckoutPage.test.tsx usa getByPlaceholderText.
  await user.type(screen.getByPlaceholderText("Seu nome"), "Maria");
  await user.type(screen.getByPlaceholderText("seu@email.com"), "maria@exemplo.com");
}

describe("CheckoutPage — bump de R$ 27", () => {
  beforeEach(() => {
    bumpNoBanco = BUMP_DISPONIVEL;
    bumpFetchResolved = 0;
    mockInvoke.mockClear();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
  });

  it("mostra a caixa do bump quando o produto do bump esta disponivel", async () => {
    renderCheckout();
    expect(await screen.findByLabelText(/Mapa dos Sentimentos que Aprisionam/i)).toBeInTheDocument();
  });

  it("NAO mostra a caixa quando o bump esta em_breve", async () => {
    bumpNoBanco = { ...BUMP_DISPONIVEL, status: "em_breve" };
    renderCheckout();
    await screen.findByText(/Finalizar pedido/i);
    // Espera o sinal positivo (a busca do bump ja resolveu) ANTES de confiar
    // na ausencia da caixa — senao o teste passaria mesmo que a caixa fosse
    // aparecer um tick depois (busca do bump roda em efeito desacoplado).
    await waitFor(() => {
      expect(bumpFetchResolved).toBeGreaterThan(0);
      expect(screen.queryByLabelText(/Mapa dos Sentimentos que Aprisionam/i)).not.toBeInTheDocument();
    });
  });

  it("NAO mostra a caixa no checkout do proprio produto do bump", async () => {
    renderCheckout(BUMP_SLUG);
    await screen.findByText(/Finalizar pedido/i);
    await waitFor(() => {
      expect(bumpFetchResolved).toBeGreaterThan(0);
      expect(screen.queryByLabelText(/Mapa dos Sentimentos que Aprisionam/i)).not.toBeInTheDocument();
    });
  });

  it("marcar a caixa muda o total de 47 para 74 (nas duas instancias do resumo)", async () => {
    const user = userEvent.setup();
    renderCheckout();
    const caixa = await screen.findByLabelText(/Mapa dos Sentimentos que Aprisionam/i);
    for (const el of totals()) expect(el).toHaveTextContent("47,00");
    await user.click(caixa);
    await waitFor(() => {
      for (const el of totals()) expect(el).toHaveTextContent("74,00");
    });
  });

  it("envia bump:true para a edge function quando marcada", async () => {
    const user = userEvent.setup();
    renderCheckout();
    await user.click(await screen.findByLabelText(/Mapa dos Sentimentos que Aprisionam/i));
    await fillNomeEmail(user);
    await user.click(screen.getByRole("button", { name: /Registrar pedido/i }));
    await waitFor(() => expect(mockInvoke).toHaveBeenCalled());
    expect(mockInvoke.mock.calls[0][1].body).toMatchObject({ bump: true });
  });

  it("envia bump:false quando nao marcada (protecao contra regressao)", async () => {
    const user = userEvent.setup();
    renderCheckout();
    await screen.findByLabelText(/Mapa dos Sentimentos que Aprisionam/i);
    await fillNomeEmail(user);
    await user.click(screen.getByRole("button", { name: /Registrar pedido/i }));
    await waitFor(() => expect(mockInvoke).toHaveBeenCalled());
    expect(mockInvoke.mock.calls[0][1].body).toMatchObject({ bump: false });
  });

  /**
   * Regressao adicional (nao um dos 6 casos do brief, mas cobre a correcao
   * do Important 2 da revisao): a rota `/checkout/:slug` nao tem `key`, entao
   * navegar de um checkout para outro reaproveita a MESMA instancia de
   * CheckoutPage — sem o reset explicito, `bumpMarcado` sobreviveria a troca
   * de produto e cobraria +R$27 sem a compradora ter marcado nada no
   * checkout novo.
   */
  it("reseta a marcacao do bump ao trocar de produto sem re-montar a pagina", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/checkout/sete-manhas"]}>
        <Link to="/checkout/outro-produto">trocar de produto</Link>
        <Routes>
          <Route path="/checkout/:slug" element={<CheckoutPage />} />
        </Routes>
      </MemoryRouter>
    );

    const caixa = await screen.findByLabelText(/Mapa dos Sentimentos que Aprisionam/i);
    await user.click(caixa);
    await waitFor(() => {
      for (const el of totals()) expect(el).toHaveTextContent("74,00");
    });

    await user.click(screen.getByRole("link", { name: /trocar de produto/i }));

    // Pagina troca de produto sem desmontar. Espera o sinal positivo de que a
    // segunda busca do bump (novo slug) ja resolveu antes de confiar no
    // estado — a mesma cautela do Important 1/soundness acima.
    await screen.findByText(/Finalizar pedido/i);
    await waitFor(() => {
      expect(bumpFetchResolved).toBeGreaterThan(1);
      const caixaNova = screen.getByLabelText(/Mapa dos Sentimentos que Aprisionam/i) as HTMLInputElement;
      expect(caixaNova.checked).toBe(false);
      for (const el of totals()) expect(el).toHaveTextContent("47,00");
    });
  });
});
