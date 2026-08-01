import { describe, it, expect } from "vitest";
import { calcularResultado, PILAR_ORDEM, type RespostaQuiz, type Pilar } from "@/lib/bussola";

const r = (pilar: Pilar, i: number): RespostaQuiz => ({ questionId: `q${i}`, pilar });

describe("calcularResultado", () => {
  it("o pilar com mais respostas vence", () => {
    const respostas = [
      r("ativacao", 1), r("ativacao", 2), r("ativacao", 3),
      r("consciencia", 4), r("reconexao", 5),
    ];
    expect(calcularResultado(respostas).pilar).toBe("ativacao");
  });

  it("empate resolve pela ordem fixa consciencia > reconexao > ativacao > integracao", () => {
    const respostas = [
      r("integracao", 1), r("integracao", 2),
      r("reconexao", 3), r("reconexao", 4),
    ];
    // empate 2x2 entre reconexao e integracao -> reconexao vem antes na ordem
    expect(calcularResultado(respostas).pilar).toBe("reconexao");
  });

  it("empate quadruplo devolve consciencia (primeira da ordem)", () => {
    const respostas = [r("consciencia", 1), r("reconexao", 2), r("ativacao", 3), r("integracao", 4)];
    expect(calcularResultado(respostas).pilar).toBe("consciencia");
  });

  it("e deterministico: mesma entrada, mesmo resultado, sempre", () => {
    const respostas = [r("ativacao", 1), r("integracao", 2)];
    const a = calcularResultado(respostas).pilar;
    for (let i = 0; i < 50; i++) {
      expect(calcularResultado(respostas).pilar).toBe(a);
    }
  });

  it("devolve a contagem completa por pilar", () => {
    const respostas = [r("consciencia", 1), r("consciencia", 2), r("ativacao", 3)];
    expect(calcularResultado(respostas).pontos).toEqual({
      consciencia: 2, reconexao: 0, ativacao: 1, integracao: 0,
    });
  });

  it("lista vazia devolve consciencia com zeros (nunca lanca)", () => {
    const out = calcularResultado([]);
    expect(out.pilar).toBe("consciencia");
    expect(out.pontos).toEqual({ consciencia: 0, reconexao: 0, ativacao: 0, integracao: 0 });
  });

  it("PILAR_ORDEM tem os 4 pilares na ordem da spec", () => {
    expect(PILAR_ORDEM).toEqual(["consciencia", "reconexao", "ativacao", "integracao"]);
  });
});
