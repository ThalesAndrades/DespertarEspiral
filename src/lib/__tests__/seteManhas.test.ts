import { describe, it, expect } from "vitest";
import { estadoTrilha, streakAtual, dataSP, type ConclusaoManha } from "@/lib/seteManhas";

// "hoje" fixo: 10/08/2026 09:00 em Sao Paulo (UTC-3 => 12:00Z)
const HOJE = "2026-08-10T12:00:00.000Z";
const c = (indice: number, dia: string): ConclusaoManha => ({
  indice,
  completedAt: `${dia}T10:00:00.000-03:00`,
});

describe("dataSP", () => {
  it("converte para a data-calendario de Sao Paulo", () => {
    // 23h de 09/08 em SP ainda e dia 09; 02:00Z de 10/08 e 23h de 09/08 em SP
    expect(dataSP("2026-08-10T02:00:00.000Z")).toBe("2026-08-09");
    expect(dataSP("2026-08-10T12:00:00.000Z")).toBe("2026-08-10");
  });
});

describe("estadoTrilha", () => {
  it("sem nenhuma conclusao: manha 1 disponivel, resto bloqueado", () => {
    const t = estadoTrilha([], HOJE);
    expect(t).toHaveLength(7);
    expect(t[0].estado).toBe("disponivel");
    expect(t.slice(1).every((m) => m.estado === "bloqueada")).toBe(true);
  });

  it("manha concluida HOJE deixa a proxima para amanha (ritmo de uma por dia)", () => {
    const t = estadoTrilha([c(1, "2026-08-10")], HOJE);
    expect(t[0].estado).toBe("concluida");
    expect(t[1].estado).toBe("amanha");
    expect(t[2].estado).toBe("bloqueada");
  });

  it("manha concluida ONTEM libera a proxima hoje", () => {
    const t = estadoTrilha([c(1, "2026-08-09")], HOJE);
    expect(t[1].estado).toBe("disponivel");
  });

  it("dia pulado deixa a volta fosca mas NAO tranca nada (nunca punicao)", () => {
    // concluiu dia 1 em 06/08, dia 2 em 07/08, pulou 08 e 09
    const t = estadoTrilha([c(1, "2026-08-06"), c(2, "2026-08-07")], HOJE);
    expect(t[0].estado).toBe("concluida");
    expect(t[1].estado).toBe("concluida");
    expect(t[1].fosca).toBe(true); // houve lacuna depois dela
    expect(t[2].estado).toBe("disponivel"); // retomar reacende — sem punicao
  });

  it("trilha completa: as 7 concluidas", () => {
    const conclusoes = [1, 2, 3, 4, 5, 6, 7].map((i) => c(i, `2026-08-0${i > 3 ? i : i + 2}`));
    const t = estadoTrilha(conclusoes, HOJE);
    expect(t.every((m) => m.estado === "concluida")).toBe(true);
  });

  it("conclusao fora de ordem nao quebra (dado sujo do banco)", () => {
    // manha 3 marcada sem a 2 (ex.: admin liberou na mao)
    const t = estadoTrilha([c(1, "2026-08-07"), c(3, "2026-08-08")], HOJE);
    expect(t[0].estado).toBe("concluida");
    expect(t[2].estado).toBe("concluida");
    expect(t[1].estado).toBe("disponivel"); // a pendente mais antiga liberada
  });

  it("e deterministica para o mesmo hoje", () => {
    const conclusoes = [c(1, "2026-08-08"), c(2, "2026-08-09")];
    const a = JSON.stringify(estadoTrilha(conclusoes, HOJE));
    expect(JSON.stringify(estadoTrilha(conclusoes, HOJE))).toBe(a);
  });

  describe("total customizavel (I-4 — produto com != 7 aulas)", () => {
    it("total=5: a trilha tem 5 pontos, e a 5a segue a mesma regra em cadeia", () => {
      const t = estadoTrilha([c(1, "2026-08-09")], HOJE, 5);
      expect(t).toHaveLength(5);
      expect(t[1].estado).toBe("disponivel"); // concluiu a 1 ontem
      expect(t.slice(2).every((m) => m.estado === "bloqueada")).toBe(true);
    });

    it("total=9: a trilha tem 9 pontos, e as aulas 8 e 9 nao escapam da trava", () => {
      const conclusoes = [1, 2, 3, 4, 5, 6, 7].map((i) => c(i, `2026-08-0${i > 3 ? i : i + 2}`));
      const t = estadoTrilha(conclusoes, HOJE, 9);
      expect(t).toHaveLength(9);
      expect(t.slice(0, 7).every((m) => m.estado === "concluida")).toBe(true);
      // manha 8 e a pendente (concluida ontem seria dia 7 -> checa livre/bloqueada por data)
      expect(["disponivel", "amanha"]).toContain(t[7].estado);
      expect(t[8].estado).toBe("bloqueada");
    });

    it("sem total explicito, mantem o comportamento de 7 (compat)", () => {
      expect(estadoTrilha([], HOJE)).toHaveLength(7);
    });
  });

  describe("completed_at ausente/malformado NUNCA re-tranca (I-3 + I-5)", () => {
    it('completedAt: "" conta como concluida em data desconhecida — libera a proxima', () => {
      const t = estadoTrilha([{ indice: 1, completedAt: "" }], HOJE);
      expect(t[0].estado).toBe("concluida");
      expect(t[1].estado).toBe("disponivel");
    });

    it('completedAt: "lixo" NAO lanca excecao e ainda conta como concluida', () => {
      expect(() => estadoTrilha([{ indice: 1, completedAt: "lixo" }], HOJE)).not.toThrow();
      const t = estadoTrilha([{ indice: 1, completedAt: "lixo" }], HOJE);
      expect(t[0].estado).toBe("concluida");
      expect(t[1].estado).toBe("disponivel");
    });

    it("manha 1 e 2 concluidas sem completedAt: a 2a NUNCA volta a bloqueada", () => {
      const t = estadoTrilha(
        [{ indice: 1, completedAt: "" }, { indice: 2, completedAt: "" }],
        HOJE
      );
      expect(t[0].estado).toBe("concluida");
      expect(t[1].estado).toBe("concluida"); // "completed sem data continua concluida"
      expect(t[2].estado).toBe("disponivel");
    });

    it("datas invalidas variadas nunca lancam", () => {
      for (const malformada of ["0000-00-00T00:00:00Z", "2026-13-45T10:00:00Z", "Invalid Date"]) {
        expect(() => estadoTrilha([{ indice: 1, completedAt: malformada }], HOJE)).not.toThrow();
      }
    });
  });
});

describe("dataSP — dado sujo nunca lanca (I-5)", () => {
  it("retorna null para ausente/vazio/invalido em vez de lancar", () => {
    expect(dataSP(null)).toBeNull();
    expect(dataSP(undefined)).toBeNull();
    expect(dataSP("")).toBeNull();
    expect(dataSP("lixo")).toBeNull();
    expect(dataSP("0000-00-00T00:00:00Z")).toBeNull();
  });
});

describe("streakAtual", () => {
  it("zero sem conclusoes", () => {
    expect(streakAtual([], HOJE)).toBe(0);
  });

  it("conta dias consecutivos terminando hoje", () => {
    expect(streakAtual([c(1, "2026-08-08"), c(2, "2026-08-09"), c(3, "2026-08-10")], HOJE)).toBe(3);
  });

  it("conta dias consecutivos terminando ONTEM (hoje ainda da tempo)", () => {
    expect(streakAtual([c(1, "2026-08-08"), c(2, "2026-08-09")], HOJE)).toBe(2);
  });

  it("lacuna de mais de um dia zera o streak (mas nada e trancado)", () => {
    expect(streakAtual([c(1, "2026-08-05"), c(2, "2026-08-06")], HOJE)).toBe(0);
  });

  it("duas conclusoes no mesmo dia contam um dia so", () => {
    expect(streakAtual([c(1, "2026-08-09"), c(2, "2026-08-09"), c(3, "2026-08-10")], HOJE)).toBe(2);
  });
});
