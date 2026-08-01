/**
 * Motor de pontuacao da Bussola da Espiral. Funcoes PURAS – sem React,
 * sem Supabase, sem Date.now(): dado o mesmo conjunto de respostas, o
 * resultado e sempre o mesmo (spec §6: deterministico, nunca aleatorio).
 */

export type Pilar = "consciencia" | "reconexao" | "ativacao" | "integracao";

/** Ordem fixa de desempate (spec §6). A primeira da lista vence o empate. */
export const PILAR_ORDEM: Pilar[] = ["consciencia", "reconexao", "ativacao", "integracao"];

export interface RespostaQuiz {
  questionId: string;
  pilar: Pilar;
}

export interface ResultadoBussola {
  pilar: Pilar;
  pontos: Record<Pilar, number>;
}

export function calcularResultado(respostas: RespostaQuiz[]): ResultadoBussola {
  const pontos: Record<Pilar, number> = {
    consciencia: 0, reconexao: 0, ativacao: 0, integracao: 0,
  };

  for (const resposta of respostas) {
    pontos[resposta.pilar] += 1;
  }

  let vencedor: Pilar = PILAR_ORDEM[0];
  for (const pilar of PILAR_ORDEM) {
    if (pontos[pilar] > pontos[vencedor]) {
      vencedor = pilar;
    }
  }

  return { pilar: vencedor, pontos };
}
