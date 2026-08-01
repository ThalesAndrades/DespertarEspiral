import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// jsdom nao implementa IntersectionObserver — a LandingPage usa pra reveal on scroll.
if (!("IntersectionObserver" in globalThis)) {
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error stub minimo so pro ambiente de teste
  globalThis.IntersectionObserver = MockIntersectionObserver;
}

// jsdom nao implementa window.matchMedia — usado pelo tema e pelo fundo 3D decorativo.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false, logout: vi.fn(), refreshUser: vi.fn() })),
}));

vi.mock("@/lib/storefront", () => ({
  fetchStorefront: vi.fn().mockResolvedValue([
    { id: "1", slug: "sete-manhas", title: "Sete Manhãs", subtitle: "", promise: "",
      price: 47, thumbnail: "", status: "disponivel", highlights: [], sort_order: 10 },
  ]),
}));

import LandingPage from "@/pages/LandingPage";

describe("LandingPage — vitrine", () => {
  it("tem exatamente um CTA primário acima da dobra", async () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    const primarios = await screen.findAllByTestId("cta-primario");
    expect(primarios).toHaveLength(1);
  });

  it("o CTA primário leva à Bússola", async () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    const cta = await screen.findByTestId("cta-primario");
    expect(cta).toHaveAttribute("href", "/bussola");
  });

  it("renderiza a vitrine com os produtos do catálogo", async () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("Sete Manhãs")).toBeInTheDocument());
  });
});
