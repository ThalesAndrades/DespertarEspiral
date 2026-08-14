/**
 * Regra do ritmo do Sete Manhas — funcoes PURAS.
 *
 * O produto e "uma manha por dia": a manha N+1 so fica disponivel no dia
 * seguinte (calendario de Sao Paulo) a conclusao da manha N. Pular dias
 * deixa a volta "fosca" (estado visual), mas NUNCA tranca o que ja foi
 * concluido nem revoga acesso (spec §3.2 — nunca punicao).
 *
 * Tudo deriva de lesson_progress.completed_at. Nenhuma tabela nova.
 * O "hoje" SEMPRE vem por parametro: nada de Date.now() aqui dentro.
 */

export const SETE_MANHAS_SLUG = "sete-manhas";
export const TOTAL_MANHAS = 7;

/**
 * Data usada quando `completedAt` esta ausente, vazio ou nao e uma data
 * valida. Fica no passado distante de proposito: a manha AINDA conta como
 * concluida (nunca re-tranca — Global Constraint "nunca punicao") e libera a
 * proxima imediatamente; a unica coisa que se perde e o calculo de streak/fosca
 * daquele dia especifico (I-3).
 */
const DATA_DESCONHECIDA = "1970-01-01";

export type EstadoManha = "concluida" | "disponivel" | "amanha" | "bloqueada";

export interface ManhaInfo {
  indice: number; // 1..N
  estado: EstadoManha;
  /** true quando houve lacuna de calendario logo apos esta manha concluida. */
  fosca: boolean;
}

export interface ConclusaoManha {
  indice: number; // 1..N
  completedAt: string; // ISO
}

/**
 * Data-calendario em America/Sao_Paulo, formato YYYY-MM-DD (en-CA = ISO).
 * Retorna `null` quando `iso` estiver ausente/vazio ou nao for uma data valida
 * — nunca lanca excecao. Dado sujo do banco (string vazia, "lixo", data
 * malformada) nao pode derrubar o render de quem chama esta funcao (I-5).
 */
export function dataSP(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function diaSeguinte(yyyyMmDd: string): string {
  const d = new Date(`${yyyyMmDd}T12:00:00.000Z`); // meio-dia evita rollover de DST
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function estadoTrilha(
  conclusoes: ConclusaoManha[],
  hojeISO: string,
  total: number = TOTAL_MANHAS
): ManhaInfo[] {
  const hoje = dataSP(hojeISO) ?? DATA_DESCONHECIDA;
  const porIndice = new Map<number, string>(); // indice -> data da conclusao (SP)
  for (const conc of conclusoes) {
    if (conc.indice >= 1 && conc.indice <= total) {
      // completed_at ausente/malformado NUNCA re-tranca uma manha ja concluida:
      // conta como concluida em data desconhecida (I-3 + I-5).
      porIndice.set(conc.indice, dataSP(conc.completedAt) ?? DATA_DESCONHECIDA);
    }
  }

  // A data da ultima conclusao entre as manhas ANTERIORES a pendente decide
  // se a pendente abre hoje ("disponivel") ou so amanha ("amanha").
  let ultimaConclusaoAntes: string | null = null;
  let pendenteEncontrada = false;

  const trilha: ManhaInfo[] = [];
  for (let indice = 1; indice <= total; indice++) {
    const dataConclusao = porIndice.get(indice);

    if (dataConclusao) {
      trilha.push({ indice, estado: "concluida", fosca: false });
      if (ultimaConclusaoAntes === null || dataConclusao > ultimaConclusaoAntes) {
        ultimaConclusaoAntes = dataConclusao;
      }
      continue;
    }

    if (!pendenteEncontrada) {
      pendenteEncontrada = true;
      if (ultimaConclusaoAntes === null) {
        // nenhuma manha concluida ainda: a primeira pendente abre ja
        trilha.push({ indice, estado: "disponivel", fosca: false });
      } else if (ultimaConclusaoAntes < hoje) {
        trilha.push({ indice, estado: "disponivel", fosca: false });
      } else {
        trilha.push({ indice, estado: "amanha", fosca: false });
      }
      continue;
    }

    trilha.push({ indice, estado: "bloqueada", fosca: false });
  }

  // Fosca: manha concluida cuja conclusao NAO foi seguida (dia seguinte) por
  // outra conclusao nem e a vespera de hoje — houve lacuna depois dela.
  const datasConcluidas = new Set(Array.from(porIndice.values()));
  for (const manha of trilha) {
    if (manha.estado !== "concluida") continue;
    const data = porIndice.get(manha.indice)!;
    const seguinte = diaSeguinte(data);
    const continuou = datasConcluidas.has(seguinte) || seguinte === hoje || data === hoje;
    manha.fosca = !continuou;
  }

  return trilha;
}

export function streakAtual(conclusoes: ConclusaoManha[], hojeISO: string): number {
  const hoje = dataSP(hojeISO) ?? DATA_DESCONHECIDA;
  // completedAt ausente/invalido vira DATA_DESCONHECIDA (1970): nunca casa com
  // "hoje"/"ontem", entao so custa o streak daquele dia, nunca lanca (I-5).
  const dias = new Set(conclusoes.map((c) => dataSP(c.completedAt) ?? DATA_DESCONHECIDA));
  if (dias.size === 0) return 0;

  // O streak termina hoje (se ja concluiu hoje) ou ontem (ainda da tempo hoje).
  let cursor = dias.has(hoje) ? hoje : (() => {
    const d = new Date(`${hoje}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  let streak = 0;
  while (dias.has(cursor)) {
    streak += 1;
    const d = new Date(`${cursor}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }
  return streak;
}
