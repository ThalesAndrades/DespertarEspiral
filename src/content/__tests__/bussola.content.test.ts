import { describe, it, expect } from "vitest";
import { PERGUNTAS, ARQUETIPOS, CONTENT_VERSION } from "@/content/bussola";
import { PILAR_ORDEM } from "@/lib/bussola";

describe("conteudo da Bussola — contrato estrutural", () => {
  it("tem exatamente 12 perguntas", () => {
    expect(PERGUNTAS).toHaveLength(12);
  });

  it("toda pergunta tem exatamente 4 opcoes, uma por pilar", () => {
    for (const p of PERGUNTAS) {
      expect(p.opcoes).toHaveLength(4);
      const pilares = p.opcoes.map((o) => o.pilar).sort();
      expect(pilares).toEqual([...PILAR_ORDEM].sort());
    }
  });

  it("ids de pergunta e opcao sao unicos", () => {
    const qids = PERGUNTAS.map((p) => p.id);
    expect(new Set(qids).size).toBe(qids.length);
    const oids = PERGUNTAS.flatMap((p) => p.opcoes.map((o) => o.id));
    expect(new Set(oids).size).toBe(oids.length);
  });

  it("nenhum texto esta vazio", () => {
    for (const p of PERGUNTAS) {
      expect(p.texto.trim().length).toBeGreaterThan(10);
      for (const o of p.opcoes) expect(o.texto.trim().length).toBeGreaterThan(3);
    }
  });

  it("ha um arquetipo para cada pilar, com nome e leitura", () => {
    for (const pilar of PILAR_ORDEM) {
      const a = ARQUETIPOS[pilar];
      expect(a.pilar).toBe(pilar);
      expect(a.nome.trim().length).toBeGreaterThan(2);
      expect(a.leitura.trim().length).toBeGreaterThan(50);
      expect(a.convite.trim().length).toBeGreaterThan(10);
    }
  });

  it("a versao do conteudo esta declarada", () => {
    expect(CONTENT_VERSION).toMatch(/^v\d/);
  });
});
