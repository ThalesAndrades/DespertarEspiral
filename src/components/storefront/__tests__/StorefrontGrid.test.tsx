import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StorefrontGrid } from "@/components/storefront/StorefrontGrid";
import type { StorefrontProduct } from "@/types";

const p = (over: Partial<StorefrontProduct>): StorefrontProduct => ({
  id: Math.random().toString(), slug: "s", title: "T", subtitle: "", promise: "",
  price: 10, thumbnail: "", status: "disponivel", highlights: [], sort_order: 100, ...over,
});

const renderGrid = (products: StorefrontProduct[]) =>
  render(<MemoryRouter><StorefrontGrid products={products} /></MemoryRouter>);

describe("StorefrontGrid", () => {
  it("renderiza um card por produto", () => {
    renderGrid([p({ title: "A" }), p({ title: "B" }), p({ title: "C" })]);
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("nao quebra com um unico produto", () => {
    renderGrid([p({ title: "Solo" })]);
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("nao quebra com lista vazia e nao mostra grade fantasma", () => {
    renderGrid([]);
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("respeita a ordem recebida", () => {
    renderGrid([p({ title: "Primeiro", sort_order: 1 }), p({ title: "Segundo", sort_order: 2 })]);
    const titulos = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titulos).toEqual(["Primeiro", "Segundo"]);
  });
});
