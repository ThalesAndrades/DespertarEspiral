# Sete Manhãs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao produto Sete Manhãs (R$ 47, já no catálogo como `em_breve`) o seu diferencial: a trilha ritual de 7 manhãs com anel de progresso e ritmo de uma manhã por dia — sem punição, sem perda de acesso.

**Architecture:** O ritmo é REGRA PURA em `src/lib/seteManhas.ts`: a manhã N+1 fica disponível no dia seguinte (America/Sao_Paulo) à conclusão da manhã N. Deriva tudo de `lesson_progress.completed_at` (coluna confirmada em uso por `CertificatePage.tsx:74`) — nenhuma tabela ou coluna nova, nenhuma migração. A UI é um componente novo (`AnelSeteManhas`) integrado cirurgicamente no `CourseViewPage` apenas quando `slug === "sete-manhas"`, e a trava real de acesso fica no `LessonPage`.

**Tech Stack:** os mesmos do repo. Zero dependências novas, zero migrações.

**Spec:** `docs/superpowers/specs/2026-07-31-fase-0-esteira-design.md` §3.2

## Global Constraints

- **Design system é lei** (tokens/classes existentes; nenhum hex; motion calmo; `prefers-reduced-motion`).
- **Copy em pt-BR.**
- **Nunca punição:** dia pulado deixa a volta "fosca" (visual), jamais tranca de novo o que já foi concluído nem revoga acesso (spec §3.2).
- **Funções de data recebem o "hoje" por parâmetro** — nada de `Date.now()` dentro da regra; timezone America/Sao_Paulo resolvido por `toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })`.
- **Branch:** `feat/fase-0-esteira`. NUNCA main.
- **Baseline: 578 testes / 545 passam / 33 falhas pré-existentes.** Não aumentar as 33. ATENÇÃO: `LessonPage.test.tsx` tem 16 dessas falhas (mocks desatualizados) — a Task 3 toca o `LessonPage` e NÃO pode consertar nem piorar esses mocks; a regra nova é testada na lib pura.
- Rodar suíte com `$env:NODE_OPTIONS = "--max-old-space-size=4096"`.

---

### Task 1: Regra do ritmo (pura)

**Files:**
- Create: `src/lib/seteManhas.ts`
- Test: `src/lib/__tests__/seteManhas.test.ts`

**Interfaces:**
- Consumes: nada
- Produces (Tasks 2–3 usam exatamente isto):
  - `SETE_MANHAS_SLUG = "sete-manhas"`
  - `dataSP(iso: string): string` — data-calendário em America/Sao_Paulo, formato `YYYY-MM-DD`
  - `type EstadoManha = "concluida" | "disponivel" | "amanha" | "bloqueada"`
  - `interface ManhaInfo { indice: number; estado: EstadoManha; fosca: boolean }`
  - `interface ConclusaoManha { indice: number; completedAt: string }`
  - `estadoTrilha(conclusoes: ConclusaoManha[], hojeISO: string): ManhaInfo[]` — sempre 7 itens
  - `streakAtual(conclusoes: ConclusaoManha[], hojeISO: string): number`

- [ ] **Step 1: Escrever os testes**

`src/lib/__tests__/seteManhas.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/lib/__tests__/seteManhas.test.ts` → módulo não existe.

- [ ] **Step 3: Implementar `src/lib/seteManhas.ts`**

```ts
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

export type EstadoManha = "concluida" | "disponivel" | "amanha" | "bloqueada";

export interface ManhaInfo {
  indice: number; // 1..7
  estado: EstadoManha;
  /** true quando houve lacuna de calendario logo apos esta manha concluida. */
  fosca: boolean;
}

export interface ConclusaoManha {
  indice: number; // 1..7
  completedAt: string; // ISO
}

/** Data-calendario em America/Sao_Paulo, formato YYYY-MM-DD (en-CA = ISO). */
export function dataSP(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function diaSeguinte(yyyyMmDd: string): string {
  const d = new Date(`${yyyyMmDd}T12:00:00.000Z`); // meio-dia evita rollover de DST
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function estadoTrilha(conclusoes: ConclusaoManha[], hojeISO: string): ManhaInfo[] {
  const hoje = dataSP(hojeISO);
  const porIndice = new Map<number, string>(); // indice -> data da conclusao (SP)
  for (const conc of conclusoes) {
    if (conc.indice >= 1 && conc.indice <= TOTAL_MANHAS) {
      porIndice.set(conc.indice, dataSP(conc.completedAt));
    }
  }

  // A data da ultima conclusao entre as manhas ANTERIORES a pendente decide
  // se a pendente abre hoje ("disponivel") ou so amanha ("amanha").
  let ultimaConclusaoAntes: string | null = null;
  let pendenteEncontrada = false;

  const trilha: ManhaInfo[] = [];
  for (let indice = 1; indice <= TOTAL_MANHAS; indice++) {
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
  const hoje = dataSP(hojeISO);
  const dias = new Set(conclusoes.map((c) => dataSP(c.completedAt)));
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
```

- [ ] **Step 4: Rodar e ver passar** — 13 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seteManhas.ts src/lib/__tests__/seteManhas.test.ts
git commit -m "feat(sete-manhas): regra pura do ritmo — uma manha por dia, nunca punicao"
```

---

### Task 2: Anel das sete manhãs

**Files:**
- Create: `src/components/seteManhas/AnelSeteManhas.tsx`
- Test: `src/components/seteManhas/__tests__/AnelSeteManhas.test.tsx`

**Interfaces:**
- Consumes: `ManhaInfo`, `EstadoManha` de `@/lib/seteManhas`
- Produces: `<AnelSeteManhas trilha={ManhaInfo[]} streak={number} />`

- [ ] **Step 1: Escrever os testes**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnelSeteManhas } from "@/components/seteManhas/AnelSeteManhas";
import type { ManhaInfo } from "@/lib/seteManhas";

const trilha = (estados: Array<[ManhaInfo["estado"], boolean?]>): ManhaInfo[] =>
  estados.map(([estado, fosca], i) => ({ indice: i + 1, estado, fosca: fosca ?? false }));

describe("AnelSeteManhas", () => {
  it("renderiza os 7 pontos com estado acessivel", () => {
    render(
      <AnelSeteManhas
        trilha={trilha([["concluida"], ["concluida", true], ["disponivel"], ["bloqueada"], ["bloqueada"], ["bloqueada"], ["bloqueada"]])}
        streak={2}
      />
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect(screen.getByLabelText("Manhã 1: concluída")).toBeInTheDocument();
    expect(screen.getByLabelText("Manhã 3: disponível hoje")).toBeInTheDocument();
    expect(screen.getByLabelText("Manhã 4: ainda bloqueada")).toBeInTheDocument();
  });

  it("mostra o streak quando maior que zero", () => {
    render(<AnelSeteManhas trilha={trilha([["concluida"], ["disponivel"], ["bloqueada"], ["bloqueada"], ["bloqueada"], ["bloqueada"], ["bloqueada"]])} streak={1} />);
    expect(screen.getByText(/1 dia seguido/)).toBeInTheDocument();
  });

  it("nao mostra streak zero (sem cobranca, sem culpa)", () => {
    render(<AnelSeteManhas trilha={trilha([["concluida", true], ["disponivel"], ["bloqueada"], ["bloqueada"], ["bloqueada"], ["bloqueada"], ["bloqueada"]])} streak={0} />);
    expect(screen.queryByText(/dia seguido/)).not.toBeInTheDocument();
  });

  it("manha 'amanha' comunica o ritmo, nao a trava", () => {
    render(<AnelSeteManhas trilha={trilha([["concluida"], ["amanha"], ["bloqueada"], ["bloqueada"], ["bloqueada"], ["bloqueada"], ["bloqueada"]])} streak={1} />);
    expect(screen.getByLabelText("Manhã 2: abre amanhã")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar**

```tsx
import type { ManhaInfo } from "@/lib/seteManhas";

interface AnelSeteManhasProps {
  trilha: ManhaInfo[];
  streak: number;
}

const ROTULO: Record<ManhaInfo["estado"], (i: number) => string> = {
  concluida: (i) => `Manhã ${i}: concluída`,
  disponivel: (i) => `Manhã ${i}: disponível hoje`,
  amanha: (i) => `Manhã ${i}: abre amanhã`,
  bloqueada: (i) => `Manhã ${i}: ainda bloqueada`,
};

/**
 * O anel de 7 pontos da jornada. Dia pulado fica "fosco" — opacidade menor,
 * nunca vermelho, nunca aviso: o tom e acolhedor por regra (spec §3.2).
 */
export function AnelSeteManhas({ trilha, streak }: AnelSeteManhasProps) {
  return (
    <section className="card-dark" style={{ padding: "var(--space-6)", borderRadius: "var(--r-lg)", display: "grid", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-4)" }}>
        <span className="overline" style={{ color: "var(--gold)" }}>Sua jornada</span>
        {streak > 0 && (
          <span className="font-body" style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
            {streak === 1 ? "1 dia seguido" : `${streak} dias seguidos`}
          </span>
        )}
      </div>

      <ol style={{ display: "flex", gap: "var(--space-3)", listStyle: "none", padding: 0, margin: 0, flexWrap: "wrap" }}>
        {trilha.map((manha) => {
          const concluida = manha.estado === "concluida";
          const disponivel = manha.estado === "disponivel";
          return (
            <li key={manha.indice} aria-label={ROTULO[manha.estado](manha.indice)} style={{ display: "grid", placeItems: "center", gap: "var(--space-1)" }}>
              <span
                aria-hidden="true"
                style={{
                  width: 34, height: 34, borderRadius: "50%",
                  display: "grid", placeItems: "center",
                  fontSize: "var(--fs-xs)",
                  background: concluida ? "var(--gold)" : "var(--bg-surface-3)",
                  color: concluida ? "var(--bg-base)" : disponivel ? "var(--gold)" : "var(--text-faint)",
                  border: disponivel ? "1px solid var(--gold)" : "1px solid var(--border-subtle)",
                  opacity: manha.fosca ? 0.45 : 1,
                  transition: "opacity var(--dur-base) var(--ease-out)",
                }}
              >
                {manha.indice}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
```

- [ ] **Step 4: Rodar e ver passar** — 4 testes.

- [ ] **Step 5: Commit**

```bash
git add src/components/seteManhas
git commit -m "feat(sete-manhas): anel de 7 pontos com estados acessiveis e volta fosca"
```

---

### Task 3: Integração — CourseViewPage e trava no LessonPage

**Files:**
- Modify: `src/pages/CourseViewPage.tsx` (renderizar o anel + estados nas aulas quando `slug === SETE_MANHAS_SLUG`)
- Modify: `src/pages/LessonPage.tsx` (trava real: aula bloqueada/amanhã redireciona de volta)
- Test: `src/pages/__tests__/CourseViewPage.seteManhas.test.tsx` (arquivo NOVO — não tocar no test file existente)

**Interfaces:**
- Consumes: `estadoTrilha`, `streakAtual`, `SETE_MANHAS_SLUG`, `dataSP` de `@/lib/seteManhas`; `AnelSeteManhas`
- Produces: comportamento final do produto

**Regras de integração (iguais nas duas páginas):**
- O produto Sete Manhãs tem 1 módulo com 7 aulas ordenadas por `sort_order`; o índice da manhã = posição (1..7) da aula nessa ordenação.
- `conclusoes` vêm do que a página já busca de `lesson_progress` — **adicionar `completed_at` ao select existente** (`.select("lesson_id")` → `.select("lesson_id, completed_at")`); o shape `Set<string>` usado hoje continua alimentado igual.
- "Hoje" é `new Date().toISOString()` capturado UMA vez por render e passado à lib (a lib continua pura).
- Para qualquer outro produto, NADA muda — todos os caminhos novos são condicionais em `SETE_MANHAS_SLUG`.

- [ ] **Step 1: Escrever os testes (arquivo novo)**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Siga o padrao de mock do CourseViewPage.test.tsx EXISTENTE para supabase e
// useAuth (copie os helpers de la; nao os importe — arquivos de teste nao
// exportam). Produto mockado: slug "sete-manhas", 1 modulo, 7 aulas audio
// com sort_order 1..7. lesson_progress devolve a aula 1 concluida ONTEM.

// ... (montar mocks no padrao do arquivo irmao)

describe("CourseViewPage — Sete Manhas", () => {
  it("renderiza o anel quando o produto e sete-manhas", async () => {
    // render com rota /course/sete-manhas
    // espera: getByText(/Sua jornada/)
  });

  it("aula 2 aparece disponivel quando a 1 foi concluida ontem", async () => {
    // espera: getByLabelText("Manhã 2: disponível hoje")
  });

  it("aulas 3..7 aparecem bloqueadas", async () => {
    // espera: getByLabelText("Manhã 3: ainda bloqueada") etc.
  });

  it("produto que NAO e sete-manhas nao renderiza anel", async () => {
    // render com slug qualquer; queryByText(/Sua jornada/) === null
  });
});
```

O esqueleto acima é intencional: os mocks do supabase deste repo são extensos e o padrão canônico está em `CourseViewPage.test.tsx` (55 testes passando) — o implementador DEVE copiá-lo dali, não inventar um novo. Os 4 casos e as asserções são obrigatórios.

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Integrar no `CourseViewPage.tsx`**

Mudanças mínimas:
1. No select de `lesson_progress` (linha ~81): `.select("lesson_id")` → `.select("lesson_id, completed_at")`; guardar também um mapa `lessonId -> completed_at`.
2. Depois de montar as aulas ordenadas, quando `product.slug === SETE_MANHAS_SLUG`:
   - construir `conclusoes: ConclusaoManha[]` a partir do mapa (índice = posição 1..7 da aula);
   - `const trilha = estadoTrilha(conclusoes, agoraISO)` e `const streak = streakAtual(conclusoes, agoraISO)`;
   - renderizar `<AnelSeteManhas trilha={trilha} streak={streak} />` acima da lista de módulos;
   - nas aulas com estado `bloqueada`/`amanha`, trocar o link por item não-clicável com o mesmo rótulo acessível do anel (reutilizar `ROTULO` não é possível — não é exportado; duplicar o texto é aceitável aqui).
3. Nenhuma mudança de comportamento para outros slugs.

- [ ] **Step 4: Trava real no `LessonPage.tsx`**

O CourseViewPage esconde o link, mas URL direta abriria a aula. No `LessonPage`, depois que produto+aulas+progresso carregarem (dados que a página já tem), quando `product.slug === SETE_MANHAS_SLUG`:

```tsx
// Trava do ritmo: aula futura do Sete Manhas nao abre por URL direta.
// Redireciona de volta para a trilha — sem toast de erro: o tom do produto
// e acolhedor, e "ainda nao" nao e falha.
const trilha = estadoTrilha(conclusoes, agoraISO);
const posicao = aulasOrdenadas.findIndex((l) => l.id === lesson.id) + 1;
const estadoDesta = trilha[posicao - 1]?.estado;
if (estadoDesta === "bloqueada" || estadoDesta === "amanha") {
  navigate(`/course/${product.slug}`, { replace: true });
  return null;
}
```

(Adaptar nomes de variáveis aos reais do arquivo. CUIDADO: `LessonPage.test.tsx` tem 16 falhas pré-existentes de mock — rode-o antes e depois da mudança e compare: o número NÃO pode passar de 16.)

- [ ] **Step 5: Rodar tudo**

```bash
npx vitest run src/pages/__tests__/CourseViewPage.seteManhas.test.tsx
npx vitest run src/pages/__tests__/LessonPage.test.tsx   # continua com as MESMAS 16 falhas
npm test                                                  # 33 pre-existentes, nem uma a mais
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/CourseViewPage.tsx src/pages/LessonPage.tsx src/pages/__tests__/CourseViewPage.seteManhas.test.tsx
git commit -m "feat(sete-manhas): anel na trilha e trava de ritmo com redirecionamento acolhedor"
```

---

## Pendências que este plano NÃO resolve

1. **Os 7 áudios e as 7 páginas de journaling** — conteúdo da Sunyan. O produto segue `em_breve` no catálogo até existirem; as aulas são cadastradas pelo admin normal (nenhum código novo).
2. **"Mural do dia" / comunidade da turma** (cohort anônima por dia) — spec da esteira, fora deste plano.
3. **Áudio-convite do dia 7 → core** — depende de conteúdo e do core estar à venda.
4. **E-mail de lembrete de manhã disponível** — automação Sequenzy futura.
