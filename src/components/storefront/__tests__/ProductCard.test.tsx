import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ProductCard } from "@/components/storefront/ProductCard";
import type { StorefrontProduct } from "@/types";

const base: StorefrontProduct = {
  id: "1", slug: "sete-manhas", title: "Sete Manhãs", subtitle: "Front-end",
  promise: "Sete dias para sair do piloto automático.", price: 47,
  thumbnail: "", status: "disponivel", highlights: ["7 áudios", "Journaling", "Comunidade"],
  sort_order: 10,
};

const renderCard = (p: StorefrontProduct, onNotify = vi.fn()) =>
  render(<MemoryRouter><ProductCard product={p} onNotify={onNotify} /></MemoryRouter>);

describe("ProductCard", () => {
  it("mostra preço e botão de compra quando disponivel", () => {
    renderCard(base);
    expect(screen.getByText("R$ 47,00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /começar agora/i })).toBeInTheDocument();
  });

  it("NAO mostra botão de compra quando em_breve", () => {
    renderCard({ ...base, status: "em_breve" });
    expect(screen.queryByRole("link", { name: /começar agora/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /avise-me/i })).toBeInTheDocument();
  });

  it("chama onNotify com o produto ao clicar em avise-me", async () => {
    const onNotify = vi.fn();
    renderCard({ ...base, status: "em_breve" }, onNotify);
    await userEvent.click(screen.getByRole("button", { name: /avise-me/i }));
    expect(onNotify).toHaveBeenCalledWith(expect.objectContaining({ slug: "sete-manhas" }));
  });

  it("exibe no maximo 3 destaques", () => {
    renderCard({ ...base, highlights: ["a", "b", "c", "d", "e"] });
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("mostra parcelamento em 12x para preco >= 100 (parcela em destaque)", () => {
    renderCard({ ...base, price: 997 });
    expect(screen.getByText("12× de")).toBeInTheDocument();
    expect(screen.getByText("R$ 83,08")).toBeInTheDocument();
    expect(screen.getByText("ou R$ 997,00 à vista")).toBeInTheDocument();
  });

  it("NAO mostra parcelamento para preco < 100", () => {
    renderCard({ ...base, price: 47 });
    expect(screen.queryByText(/12× de/)).not.toBeInTheDocument();
  });

  it("mostra selo de garantia de 7 dias quando disponivel", () => {
    renderCard(base);
    expect(screen.getByText(/garantia incondicional de 7 dias/i)).toBeInTheDocument();
  });

  it("produto gratuito disponivel linka para /bussola, nao para checkout", () => {
    renderCard({ ...base, slug: "bussola-da-espiral", price: 0, status: "disponivel" });
    const cta = screen.getByRole("link", { name: /fazer o diagnóstico/i });
    expect(cta).toHaveAttribute("href", "/bussola");
    expect(screen.queryByRole("link", { name: /começar agora/i })).not.toBeInTheDocument();
  });

  it("produto gratuito mostra 'Gratuito' no lugar do preco e sem parcelamento", () => {
    renderCard({ ...base, slug: "bussola-da-espiral", price: 0, status: "disponivel" });
    expect(screen.getByText("Gratuito")).toBeInTheDocument();
    expect(screen.queryByText(/12×/)).not.toBeInTheDocument();
  });

  it("gratuito sem rota mapeada mostra avise-me, mesmo com status disponivel", () => {
    renderCard({ ...base, slug: "outro-gratuito-sem-mapa", price: 0, status: "disponivel" });
    expect(screen.getByRole("button", { name: /avise-me/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /fazer o diagnóstico/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /começar agora/i })).not.toBeInTheDocument();
  });

  it("aplica borda dourada quando featured", () => {
    const { container } = render(
      <MemoryRouter><ProductCard product={base} onNotify={vi.fn()} featured /></MemoryRouter>
    );
    const article = container.querySelector("article");
    expect(article).toHaveStyle({ border: "1px solid var(--gold-dim)" });
  });

  it("NAO aplica borda dourada quando nao featured", () => {
    const { container } = renderCard(base);
    const article = container.querySelector("article");
    expect(article?.style.border).toBe("");
  });
});
