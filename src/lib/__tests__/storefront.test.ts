import { describe, it, expect } from "vitest";
import { sortStorefront } from "@/lib/storefront";
import type { StorefrontProduct } from "@/types";

const p = (over: Partial<StorefrontProduct>): StorefrontProduct => ({
  id: "x", slug: "s", title: "T", subtitle: "", promise: "", price: 0,
  thumbnail: "", status: "disponivel", highlights: [], sort_order: 100, ...over,
});

describe("sortStorefront", () => {
  it("ordena por sort_order crescente", () => {
    const out = sortStorefront([p({ id: "b", sort_order: 20 }), p({ id: "a", sort_order: 10 })]);
    expect(out.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("coloca disponivel antes de em_breve quando o sort_order empata", () => {
    const out = sortStorefront([
      p({ id: "breve", status: "em_breve", sort_order: 10 }),
      p({ id: "pronto", status: "disponivel", sort_order: 10 }),
    ]);
    expect(out.map((x) => x.id)).toEqual(["pronto", "breve"]);
  });

  it("nao muta o array recebido", () => {
    const input = [p({ id: "b", sort_order: 20 }), p({ id: "a", sort_order: 10 })];
    sortStorefront(input);
    expect(input.map((x) => x.id)).toEqual(["b", "a"]);
  });
});
