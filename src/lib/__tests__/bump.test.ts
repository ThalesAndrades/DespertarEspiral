import { describe, it, expect } from "vitest";
import { BUMP_SLUG, bumpOferecivel, calcularTotal, type ProdutoBump } from "@/lib/bump";

const bumpOk: ProdutoBump = {
  id: "bump-1", slug: BUMP_SLUG, title: "Mapa dos Sentimentos que Aprisionam",
  price: 27, is_active: true, status: "disponivel",
};

describe("bumpOferecivel", () => {
  it("oferece quando o produto esta ativo, disponivel e com preco", () => {
    expect(bumpOferecivel(bumpOk, "sete-manhas")).toBe(true);
  });

  it("NAO oferece quando o bump esta em_breve (regra dura: em_breve nao vende)", () => {
    expect(bumpOferecivel({ ...bumpOk, status: "em_breve" }, "sete-manhas")).toBe(false);
  });

  it("NAO oferece quando o bump esta inativo", () => {
    expect(bumpOferecivel({ ...bumpOk, is_active: false }, "sete-manhas")).toBe(false);
  });

  it("NAO oferece quando o produto do checkout E o proprio bump (nao vender duas vezes)", () => {
    expect(bumpOferecivel(bumpOk, BUMP_SLUG)).toBe(false);
  });

  it("NAO oferece quando o bump nao existe ou tem preco invalido", () => {
    expect(bumpOferecivel(null, "sete-manhas")).toBe(false);
    expect(bumpOferecivel(undefined, "sete-manhas")).toBe(false);
    expect(bumpOferecivel({ ...bumpOk, price: 0 }, "sete-manhas")).toBe(false);
    expect(bumpOferecivel({ ...bumpOk, price: Number.NaN }, "sete-manhas")).toBe(false);
  });
});

describe("calcularTotal", () => {
  it("sem bump marcado, o total e o preco do produto", () => {
    expect(calcularTotal(47, 27, false)).toBe(47);
  });

  it("com bump marcado, soma os dois", () => {
    expect(calcularTotal(47, 27, true)).toBe(74);
  });

  it("bump marcado sem preco de bump nao altera o total (defensivo)", () => {
    expect(calcularTotal(47, null, true)).toBe(47);
    expect(calcularTotal(47, undefined, true)).toBe(47);
  });

  it("arredonda em centavos — nunca devolve 75.39999999999999", () => {
    expect(calcularTotal(47.9, 27.5, true)).toBe(75.4);
  });

  it("preco de produto invalido nunca vira NaN no total", () => {
    expect(calcularTotal(Number.NaN, 27, true)).toBe(0);
  });
});
