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
    expect(screen.getByRole("link", { name: /quero começar/i })).toBeInTheDocument();
  });

  it("NAO mostra botão de compra quando em_breve", () => {
    renderCard({ ...base, status: "em_breve" });
    expect(screen.queryByRole("link", { name: /quero começar/i })).not.toBeInTheDocument();
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
});
