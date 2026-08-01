# Bússola da Espiral — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colocar no ar `/bussola` — o diagnóstico gratuito de 12 perguntas que descobre o pilar travado e o arquétipo da visitante, captura o e-mail antes do resultado e grava a segmentação que alimenta toda a esteira. Destrava o gate de merge nº 3 da branch (o CTA da home aponta para `/bussola`).

**Architecture:** Três camadas puras e uma de página. (1) `src/lib/bussola.ts`: pontuação e desempate — funções puras, sem React. (2) `src/content/bussola.ts`: as 12 perguntas e os 4 arquétipos como dados versionados, com flag de conteúdo provisório. (3) `src/components/quiz/`: componentes de UI pequenos e testáveis. (4) `src/pages/BussolaPage.tsx`: só orquestra. Banco: tabela `quiz_responses` (INSERT anônimo) + colunas de segmentação em `user_profiles`, ligadas por trigger.

**Tech Stack:** Vite, React 18, TypeScript, Supabase (postgres + RLS + trigger), vitest + Testing Library. Zero dependências novas.

**Spec:** `docs/superpowers/specs/2026-07-31-fase-0-esteira-design.md` §3.1, §4, §6, §8

## Global Constraints

- **Design system é lei** (`DESIGN_SYSTEM.md`): só tokens `var(--*)` e classes existentes (`.card-dark`, `.font-display`, `.overline`, `.btn-gold`, `.btn-outline-gold`, `.interactive`); nenhum hex solto; nenhum `cubic-bezier` inline; `prefers-reduced-motion` respeitado.
- **Copy em pt-BR.**
- **O e-mail vem ANTES do resultado** — o resultado é a moeda de troca (spec §3.1).
- **Nada é gravado no banco antes do e-mail** (spec §6). Progresso parcial vive em `sessionStorage`.
- **Empate entre pilares:** desempate pela ordem fixa Consciência → Reconexão → Ativação → Integração. Determinístico, nunca aleatório (spec §6).
- **Falha ao gravar não bloqueia o resultado** — a visitante vê o arquétipo; a falha é logada (spec §6).
- **Conteúdo provisório é marcado** (`CONTEUDO_PROVISORIO = true`) e o gate de publicação é a aprovação da Sunyan — não deste plano.
- **Branch:** `feat/fase-0-esteira`. NUNCA commitar em `main`.
- **Baseline de testes: 551 total / 518 passam / 33 falhas pré-existentes.** Não aumentar as 33.
- Migrações NÃO são aplicadas por tasks — só escritas. Aplicação é decisão do dono.

## Desvio declarado da spec

A spec §3.1 manda extrair o motor do `MapaDoPoder.tsx` e fazer **as duas páginas** consumirem os mesmos componentes. O MapaDoPoder tem **zero testes** (verificado em 01/08) e é uma página de evento em produção acessada por QR code: refatorá-lo sem rede de proteção arrisca quebrar algo que ninguém vai perceber até o próximo evento. Decisão: a Bússola nasce com componentes limpos em `src/components/quiz/`; **migrar o MapaDoPoder para consumi-los vira pendência explícita** (ver Pendências), a ser feita quando ele tiver testes de caracterização.

---

### Task 1: Migração — quiz_responses, segmentação e trigger

**Files:**
- Create: `supabase/migrations/20260801_000001_bussola.sql`

**Interfaces:**
- Consumes: tabelas existentes `user_profiles` (chaveada por `id` = auth uid; SEM coluna email), `auth.users`
- Produces: tabela `public.quiz_responses`; colunas `user_profiles.social_archetype text`, `user_profiles.pain_primary text`, `user_profiles.archetype_at timestamptz`; trigger `trg_quiz_backfill_profile`

- [ ] **Step 1: Escrever a migração**

```sql
-- Bussola da Espiral: respostas cruas + segmentacao.
--
-- quiz_responses guarda CADA conclusao do quiz (email + 12 respostas + resultado),
-- inclusive de visitantes sem conta. Refazer o quiz gera nova linha (historico
-- preservado, spec §6). As respostas cruas permitem recalibrar o quiz depois.
--
-- user_profiles nao tem email (a chave e o auth uid); a ponte visitante->usuaria
-- e feita por trigger que consulta auth.users pelo email. SECURITY DEFINER
-- porque o papel anon nao enxerga auth.users nem pode escrever em perfis alheios.

create table if not exists public.quiz_responses (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  answers jsonb not null,
  pain_primary text not null,
  social_archetype text not null,
  content_version text not null default 'v1-provisorio',
  created_at timestamptz not null default now()
);

create index if not exists idx_quiz_responses_email
  on public.quiz_responses (lower(email), created_at desc);

alter table public.quiz_responses enable row level security;

-- Visitante anonima PODE inserir (e o unico jeito de o quiz publico gravar).
-- Ninguem le pela API publica: SELECT so para service_role/admin via painel.
drop policy if exists "quiz_responses_anon_insert" on public.quiz_responses;
create policy "quiz_responses_anon_insert" on public.quiz_responses
  for insert to anon, authenticated
  with check (true);

-- Segmentacao no perfil (spec §4).
alter table public.user_profiles
  add column if not exists social_archetype text,
  add column if not exists pain_primary text,
  add column if not exists archetype_at timestamptz;

-- Backfill: ao gravar uma resposta, se existir usuaria com aquele email,
-- atualiza o perfil dela. Se nao existir, nada acontece — e quando ela criar
-- conta depois, o handle_new_user (se existir) NAO cobre isso; a associacao
-- retroativa fica para um plano futuro (ver Pendencias do plano).
create or replace function public.quiz_backfill_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  select u.id into uid
    from auth.users u
   where lower(u.email) = lower(new.email)
   limit 1;

  if uid is not null then
    update public.user_profiles
       set social_archetype = new.social_archetype,
           pain_primary     = new.pain_primary,
           archetype_at     = new.created_at
     where id = uid;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_quiz_backfill_profile on public.quiz_responses;
create trigger trg_quiz_backfill_profile
  after insert on public.quiz_responses
  for each row execute function public.quiz_backfill_profile();
```

- [ ] **Step 2: NÃO aplicar.** Nenhum `supabase db push`. A aplicação é gate do dono.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260801_000001_bussola.sql
git commit -m "feat(db): quiz_responses + segmentacao no perfil + trigger de backfill"
```

---

### Task 2: Motor de pontuação (puro)

**Files:**
- Create: `src/lib/bussola.ts`
- Test: `src/lib/__tests__/bussola.test.ts`

**Interfaces:**
- Consumes: nada (funções puras)
- Produces (as Tasks 3–5 usam exatamente isto):
  - `type Pilar = "consciencia" | "reconexao" | "ativacao" | "integracao"`
  - `PILAR_ORDEM: Pilar[]` — ordem fixa de desempate
  - `interface RespostaQuiz { questionId: string; pilar: Pilar }`
  - `interface ResultadoBussola { pilar: Pilar; pontos: Record<Pilar, number> }`
  - `calcularResultado(respostas: RespostaQuiz[]): ResultadoBussola`

- [ ] **Step 1: Escrever os testes**

`src/lib/__tests__/bussola.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run src/lib/__tests__/bussola.test.ts
```

Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `src/lib/bussola.ts`**

```ts
/**
 * Motor de pontuacao da Bussola da Espiral. Funcoes PURAS — sem React,
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
```

- [ ] **Step 4: Rodar e ver passar**

```bash
npx vitest run src/lib/__tests__/bussola.test.ts
```

Expected: PASS, 7 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bussola.ts src/lib/__tests__/bussola.test.ts
git commit -m "feat(bussola): motor de pontuacao puro com desempate deterministico"
```

---

### Task 3: Conteúdo versionado (provisório)

**Files:**
- Create: `src/content/bussola.ts`
- Test: `src/content/__tests__/bussola.content.test.ts`

**Interfaces:**
- Consumes: `Pilar` de `@/lib/bussola`
- Produces:
  - `CONTEUDO_PROVISORIO: boolean` (true até a Sunyan aprovar)
  - `CONTENT_VERSION: string`
  - `interface OpcaoQuiz { id: string; texto: string; pilar: Pilar }`
  - `interface PerguntaQuiz { id: string; texto: string; opcoes: OpcaoQuiz[] }`
  - `PERGUNTAS: PerguntaQuiz[]` (12 perguntas × 4 opções)
  - `interface Arquetipo { pilar: Pilar; nome: string; titulo: string; leitura: string; convite: string }`
  - `ARQUETIPOS: Record<Pilar, Arquetipo>`

- [ ] **Step 1: Escrever o teste de validação estrutural**

O conteúdo é dado, mas dado com contrato — o teste impede que uma edição futura da Sunyan quebre o quiz silenciosamente:

```ts
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
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/content/__tests__/bussola.content.test.ts` → FAIL, módulo não existe.

- [ ] **Step 3: Escrever o conteúdo**

`src/content/bussola.ts` — as 12 perguntas e 4 arquétipos abaixo são **rascunho meu a partir dos blueprints** (4 pilares e o arquétipo "A Adormecida" vêm do `ESTEIRA-DIGITAL-10-PRODUTOS-v2.pdf`). Servem para o quiz funcionar de ponta a ponta; a Sunyan **revisa e substitui** antes de publicar.

```ts
import type { Pilar } from "@/lib/bussola";

/**
 * ⚠️ CONTEUDO PROVISORIO — rascunho derivado dos blueprints da marca.
 * Gate de publicacao: a Sunyan revisa cada pergunta, opcao e leitura de
 * arquetipo e vira esta flag para false na mesma alteracao em que aprovar.
 * O quiz NAO deve ser divulgado enquanto isto for true.
 */
export const CONTEUDO_PROVISORIO = true;
export const CONTENT_VERSION = "v1-provisorio";

export interface OpcaoQuiz {
  id: string;
  texto: string;
  pilar: Pilar;
}

export interface PerguntaQuiz {
  id: string;
  texto: string;
  opcoes: OpcaoQuiz[];
}

export interface Arquetipo {
  pilar: Pilar;
  nome: string;
  titulo: string;
  leitura: string;
  convite: string;
}

export const PERGUNTAS: PerguntaQuiz[] = [
  {
    id: "q1",
    texto: "Quando você acorda, qual é o primeiro sentimento que costuma aparecer?",
    opcoes: [
      { id: "q1a", pilar: "consciencia", texto: "Uma neblina — sigo no automático sem me perguntar como estou" },
      { id: "q1b", pilar: "reconexao", texto: "Uma saudade de mim mesma que não sei nomear" },
      { id: "q1c", pilar: "ativacao", texto: "Vontade de mudar tudo, que se dissolve antes do café" },
      { id: "q1d", pilar: "integracao", texto: "Clareza do que preciso, mas os dias não se conectam" },
    ],
  },
  {
    id: "q2",
    texto: "O que mais pesa na sua rotina hoje?",
    opcoes: [
      { id: "q2a", pilar: "consciencia", texto: "Viver reagindo — os dias decidem por mim" },
      { id: "q2b", pilar: "reconexao", texto: "Cuidar de todo mundo e nunca sobrar para mim" },
      { id: "q2c", pilar: "ativacao", texto: "Saber o que quero e não conseguir começar" },
      { id: "q2d", pilar: "integracao", texto: "Começar mil coisas e não sustentar nenhuma" },
    ],
  },
  {
    id: "q3",
    texto: "Quando algo te machuca, o que você costuma fazer?",
    opcoes: [
      { id: "q3a", pilar: "consciencia", texto: "Sigo em frente sem olhar — nem percebo que doeu" },
      { id: "q3b", pilar: "reconexao", texto: "Guardo para não incomodar ninguém" },
      { id: "q3c", pilar: "ativacao", texto: "Prometo que vou mudar, mas fico onde estou" },
      { id: "q3d", pilar: "integracao", texto: "Entendo a dor, mas ela volta nos mesmos ciclos" },
    ],
  },
  {
    id: "q4",
    texto: "Como está a sua relação com o próprio corpo?",
    opcoes: [
      { id: "q4a", pilar: "consciencia", texto: "Só o escuto quando ele grita — dor, cansaço, insônia" },
      { id: "q4b", pilar: "reconexao", texto: "Sinto que moro do pescoço para cima" },
      { id: "q4c", pilar: "ativacao", texto: "Sei o que ele pede, mas nunca é prioridade" },
      { id: "q4d", pilar: "integracao", texto: "Cuido em fases: semanas de presença, meses de abandono" },
    ],
  },
  {
    id: "q5",
    texto: "Qual frase mais parece sua?",
    opcoes: [
      { id: "q5a", pilar: "consciencia", texto: "\"Nem sei o que eu sinto, de verdade.\"" },
      { id: "q5b", pilar: "reconexao", texto: "\"Eu me perdi em algum lugar do caminho.\"" },
      { id: "q5c", pilar: "ativacao", texto: "\"Falta coragem para fazer o que eu já sei.\"" },
      { id: "q5d", pilar: "integracao", texto: "\"Eu sei tanto e vivo tão pouco do que sei.\"" },
    ],
  },
  {
    id: "q6",
    texto: "Nos relacionamentos, o padrão que mais se repete é…",
    opcoes: [
      { id: "q6a", pilar: "consciencia", texto: "Só percebo que estava infeliz depois que acaba" },
      { id: "q6b", pilar: "reconexao", texto: "Desapareço para caber no outro" },
      { id: "q6c", pilar: "ativacao", texto: "Vejo o problema e adio a conversa que precisava ter" },
      { id: "q6d", pilar: "integracao", texto: "Melhoro por um tempo e volto ao mesmo lugar" },
    ],
  },
  {
    id: "q7",
    texto: "O que você faz com a sua intuição?",
    opcoes: [
      { id: "q7a", pilar: "consciencia", texto: "Intuição? O barulho de fora é mais alto que qualquer voz de dentro" },
      { id: "q7b", pilar: "reconexao", texto: "Eu a sinto, mas desconfio dela — peço opinião de todo mundo" },
      { id: "q7c", pilar: "ativacao", texto: "Ela fala claro e eu finjo que não ouvi" },
      { id: "q7d", pilar: "integracao", texto: "Confio em dias bons, traio em dias difíceis" },
    ],
  },
  {
    id: "q8",
    texto: "Quando aparece um tempo só seu, o que acontece?",
    opcoes: [
      { id: "q8a", pilar: "consciencia", texto: "Preencho com tela, tarefa, qualquer coisa — silêncio incomoda" },
      { id: "q8b", pilar: "reconexao", texto: "Não sei mais o que eu gosto de fazer sozinha" },
      { id: "q8c", pilar: "ativacao", texto: "Planejo coisas incríveis que não saem do papel" },
      { id: "q8d", pilar: "integracao", texto: "Uso bem às vezes, mas sem constância" },
    ],
  },
  {
    id: "q9",
    texto: "A palavra que melhor descreve sua energia hoje:",
    opcoes: [
      { id: "q9a", pilar: "consciencia", texto: "Anestesiada" },
      { id: "q9b", pilar: "reconexao", texto: "Fragmentada" },
      { id: "q9c", pilar: "ativacao", texto: "Represada" },
      { id: "q9d", pilar: "integracao", texto: "Intermitente" },
    ],
  },
  {
    id: "q10",
    texto: "O que você mais teme, se nada mudar?",
    opcoes: [
      { id: "q10a", pilar: "consciencia", texto: "Chegar ao fim sem ter percebido a própria vida" },
      { id: "q10b", pilar: "reconexao", texto: "Nunca mais reencontrar quem eu era" },
      { id: "q10c", pilar: "ativacao", texto: "Morrer com a música ainda dentro de mim" },
      { id: "q10d", pilar: "integracao", texto: "Saber tudo sobre mim e continuar vivendo igual" },
    ],
  },
  {
    id: "q11",
    texto: "Se a sua vida fosse uma casa, ela estaria…",
    opcoes: [
      { id: "q11a", pilar: "consciencia", texto: "Com as luzes apagadas — moro nela sem ver" },
      { id: "q11b", pilar: "reconexao", texto: "Cheia de gente, menos de mim" },
      { id: "q11c", pilar: "ativacao", texto: "Com a reforma pronta no papel há anos" },
      { id: "q11d", pilar: "integracao", texto: "Com cômodos lindos que não conversam entre si" },
    ],
  },
  {
    id: "q12",
    texto: "O que você espera encontrar do outro lado desta jornada?",
    opcoes: [
      { id: "q12a", pilar: "consciencia", texto: "Acordar — ver com clareza o que estou vivendo" },
      { id: "q12b", pilar: "reconexao", texto: "Voltar para mim — habitar meu corpo e minha história" },
      { id: "q12c", pilar: "ativacao", texto: "Coragem — transformar clareza em movimento" },
      { id: "q12d", pilar: "integracao", texto: "Consistência — fazer a mudança durar" },
    ],
  },
];

export const ARQUETIPOS: Record<Pilar, Arquetipo> = {
  consciencia: {
    pilar: "consciencia",
    nome: "A Adormecida",
    titulo: "Seu pilar travado é a Consciência",
    leitura:
      "Você aprendeu a funcionar — e funcionar virou anestesia. Os dias passam no automático e a sua vida acontece sem testemunha. A Adormecida não está quebrada: está protegida por um sono que um dia foi necessário. O primeiro movimento da espiral não é mudar nada. É acordar e VER — sem julgamento, sem pressa. A clareza que você teme é a mesma que vai te devolver a vida.",
    convite: "O Sete Manhãs foi desenhado exatamente para isto: sete despertares guiados, dez minutos por manhã.",
  },
  reconexao: {
    pilar: "reconexao",
    nome: "A Exilada",
    titulo: "Seu pilar travado é a Reconexão",
    leitura:
      "Você sabe exatamente onde todo mundo está — menos você. Em algum ponto do caminho, caber na vida dos outros custou o seu próprio endereço interno. A Exilada não se perdeu por fraqueza: ela se doou até sumir. A volta não é dramática; é feita de pequenos reencontros — com o corpo, com o gosto, com a voz que ficou de fora. Você não precisa se reinventar. Precisa se REENCONTRAR.",
    convite: "O Sete Manhãs é um caminho de volta: sete manhãs em que a prioridade, pela primeira vez em anos, é você.",
  },
  ativacao: {
    pilar: "ativacao",
    nome: "A Represada",
    titulo: "Seu pilar travado é a Ativação",
    leitura:
      "Clareza você tem. Livros, terapias, insights — o mapa está desenhado há anos. O que falta não é saber: é ATRAVESSAR. A Represada acumula força atrás de um dique de medo que se disfarça de prudência, de timing, de 'depois'. E força represada, com o tempo, vira ansiedade. A espiral não pede o salto gigante que você imagina — pede o primeiro passo pequeno, dado HOJE, com o corpo junto.",
    convite: "O Sete Manhãs transforma intenção em movimento: uma prática pequena por dia, sete dias seguidos. Começar é o método.",
  },
  integracao: {
    pilar: "integracao",
    nome: "A Intermitente",
    titulo: "Seu pilar travado é a Integração",
    leitura:
      "Você já acordou, já se reencontrou, já se moveu — em ondas. O seu desafio não é começar: é SUSTENTAR. A Intermitente vive ciclos de presença intensa seguidos de recaídas no automático, e cada recaída cobra um imposto de culpa que atrasa o próximo ciclo. A espiral tem uma notícia para você: a recaída faz parte da subida. O que muda tudo não é intensidade — é ritmo. Pequeno, diário, gentil.",
    convite: "O Sete Manhãs instala exatamente esse ritmo: sete dias de constância guiada, sem punição por tropeço.",
  },
};
```

- [ ] **Step 4: Rodar e ver passar** — `npx vitest run src/content/__tests__/bussola.content.test.ts` → PASS, 6 testes.

- [ ] **Step 5: Commit**

```bash
git add src/content/bussola.ts src/content/__tests__/bussola.content.test.ts
git commit -m "feat(bussola): conteudo v1 PROVISORIO com contrato estrutural testado

12 perguntas x 4 opcoes e 4 arquetipos, rascunhados a partir dos
blueprints. CONTEUDO_PROVISORIO=true ate a Sunyan aprovar."
```

---

### Task 4: Componentes do quiz

**Files:**
- Create: `src/components/quiz/QuizProgress.tsx`
- Create: `src/components/quiz/QuizQuestion.tsx`
- Create: `src/components/quiz/EmailGate.tsx`
- Create: `src/components/quiz/ResultadoCard.tsx`
- Test: `src/components/quiz/__tests__/quiz.test.tsx`

**Interfaces:**
- Consumes: `PerguntaQuiz`, `Arquetipo` de `@/content/bussola`; `Pilar` de `@/lib/bussola`
- Produces:
  - `<QuizProgress atual={number} total={number} />`
  - `<QuizQuestion pergunta={PerguntaQuiz} onResponder={(opcaoId: string, pilar: Pilar) => void} />`
  - `<EmailGate onConfirmar={(email: string) => void} enviando={boolean} />`
  - `<ResultadoCard arquetipo={Arquetipo} />`

- [ ] **Step 1: Escrever os testes**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizProgress } from "@/components/quiz/QuizProgress";
import { QuizQuestion } from "@/components/quiz/QuizQuestion";
import { EmailGate } from "@/components/quiz/EmailGate";
import { ResultadoCard } from "@/components/quiz/ResultadoCard";
import { PERGUNTAS, ARQUETIPOS } from "@/content/bussola";

describe("QuizProgress", () => {
  it("anuncia o progresso de forma acessivel", () => {
    render(<QuizProgress atual={3} total={12} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3");
    expect(screen.getByText("3 de 12")).toBeInTheDocument();
  });
});

describe("QuizQuestion", () => {
  it("renderiza a pergunta e as 4 opcoes", () => {
    render(<QuizQuestion pergunta={PERGUNTAS[0]} onResponder={vi.fn()} />);
    expect(screen.getByRole("heading")).toHaveTextContent(PERGUNTAS[0].texto);
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("clicar numa opcao chama onResponder com id e pilar", async () => {
    const onResponder = vi.fn();
    render(<QuizQuestion pergunta={PERGUNTAS[0]} onResponder={onResponder} />);
    await userEvent.click(screen.getByRole("button", { name: PERGUNTAS[0].opcoes[2].texto }));
    expect(onResponder).toHaveBeenCalledWith(PERGUNTAS[0].opcoes[2].id, PERGUNTAS[0].opcoes[2].pilar);
  });
});

describe("EmailGate", () => {
  it("nao confirma com email invalido", async () => {
    const onConfirmar = vi.fn();
    render(<EmailGate onConfirmar={onConfirmar} enviando={false} />);
    await userEvent.type(screen.getByRole("textbox"), "nao-e-email");
    await userEvent.click(screen.getByRole("button"));
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("confirma com email valido, normalizado", async () => {
    const onConfirmar = vi.fn();
    render(<EmailGate onConfirmar={onConfirmar} enviando={false} />);
    await userEvent.type(screen.getByRole("textbox"), "  Maria@Exemplo.COM ");
    await userEvent.click(screen.getByRole("button"));
    expect(onConfirmar).toHaveBeenCalledWith("maria@exemplo.com");
  });

  it("desabilita o botao enquanto envia", () => {
    render(<EmailGate onConfirmar={vi.fn()} enviando={true} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("ResultadoCard", () => {
  it("mostra nome, titulo, leitura e o CTA para o Sete Manhas", () => {
    render(<ResultadoCard arquetipo={ARQUETIPOS.ativacao} />);
    expect(screen.getByText("A Represada")).toBeInTheDocument();
    expect(screen.getByText(ARQUETIPOS.ativacao.titulo)).toBeInTheDocument();
    expect(screen.getByText(ARQUETIPOS.ativacao.leitura)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — módulos não existem.

- [ ] **Step 3: Implementar os 4 componentes**

`src/components/quiz/QuizProgress.tsx`:

```tsx
interface QuizProgressProps {
  atual: number;
  total: number;
}

/** A espiral que se desenha: o progresso E a estetica (spec §3.1 / esteira). */
export function QuizProgress({ atual, total }: QuizProgressProps) {
  const pct = total > 0 ? Math.round((atual / total) * 100) : 0;
  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      <div
        role="progressbar"
        aria-valuenow={atual}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Pergunta ${atual} de ${total}`}
        style={{
          height: 4, borderRadius: 100, background: "var(--bg-surface-3)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`, height: "100%", background: "var(--gold)",
            borderRadius: 100, transition: "width var(--dur-slow) var(--ease-out)",
          }}
        />
      </div>
      <span className="overline" style={{ color: "var(--text-muted)", textAlign: "center" }}>
        {atual} de {total}
      </span>
    </div>
  );
}
```

`src/components/quiz/QuizQuestion.tsx`:

```tsx
import type { Pilar } from "@/lib/bussola";
import type { PerguntaQuiz } from "@/content/bussola";

interface QuizQuestionProps {
  pergunta: PerguntaQuiz;
  onResponder: (opcaoId: string, pilar: Pilar) => void;
}

export function QuizQuestion({ pergunta, onResponder }: QuizQuestionProps) {
  return (
    <div style={{ display: "grid", gap: "var(--space-6)" }}>
      <h2
        className="font-display"
        style={{ fontSize: "var(--fs-xl)", fontWeight: 300, color: "var(--text-primary)", textAlign: "center" }}
      >
        {pergunta.texto}
      </h2>
      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        {pergunta.opcoes.map((opcao) => (
          <button
            key={opcao.id}
            type="button"
            className="card-dark interactive"
            onClick={() => onResponder(opcao.id, opcao.pilar)}
            style={{
              textAlign: "left", padding: "var(--space-4) var(--space-5)",
              borderRadius: "var(--r-md)", minHeight: 52, cursor: "pointer",
              color: "var(--text-secondary)", fontSize: "var(--fs-base)",
              border: "1px solid var(--border-subtle)", background: "var(--card-bg)",
            }}
          >
            {opcao.texto}
          </button>
        ))}
      </div>
    </div>
  );
}
```

`src/components/quiz/EmailGate.tsx`:

```tsx
import { useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailGateProps {
  onConfirmar: (email: string) => void;
  enviando: boolean;
}

/** O email vem ANTES do resultado — o resultado e a moeda de troca (spec §3.1). */
export function EmailGate({ onConfirmar, enviando }: EmailGateProps) {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizado = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalizado)) {
      setErro(true);
      return;
    }
    setErro(false);
    onConfirmar(normalizado);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "var(--space-4)", maxWidth: 420, margin: "0 auto" }}>
      <h2 className="font-display" style={{ fontSize: "var(--fs-xl)", fontWeight: 300, textAlign: "center", color: "var(--text-primary)" }}>
        Seu retrato está pronto.
      </h2>
      <p className="font-body" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)", textAlign: "center" }}>
        Deixe seu e-mail para receber o resultado — e guardá-lo para quando quiser voltar.
      </p>
      <label htmlFor="bussola-email" className="overline" style={{ color: "var(--text-muted)" }}>
        Seu e-mail
      </label>
      <input
        id="bussola-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="voce@exemplo.com"
        aria-invalid={erro}
        style={{
          background: "var(--input-bg)", border: `1px solid ${erro ? "var(--rose)" : "var(--input-border)"}`,
          borderRadius: "var(--r-sm)", padding: "var(--space-3) var(--space-4)",
          color: "var(--text-primary)", fontSize: "var(--fs-base)", minHeight: 52,
        }}
      />
      {erro && (
        <p className="font-body" role="alert" style={{ fontSize: "var(--fs-xs)", color: "var(--rose)" }}>
          Confere o e-mail? Ele não parece completo.
        </p>
      )}
      <button type="submit" className="btn-gold" disabled={enviando}>
        {enviando ? "Preparando..." : "Ver meu resultado"}
      </button>
    </form>
  );
}
```

`src/components/quiz/ResultadoCard.tsx`:

```tsx
import { Link } from "react-router-dom";
import type { Arquetipo } from "@/content/bussola";

interface ResultadoCardProps {
  arquetipo: Arquetipo;
}

export function ResultadoCard({ arquetipo }: ResultadoCardProps) {
  return (
    <article className="card-dark" style={{ padding: "var(--space-10) var(--space-6)", borderRadius: "var(--r-xl)", border: "1px solid var(--gold-dim, var(--gold))", display: "grid", gap: "var(--space-5)", maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
      <span className="overline" style={{ color: "var(--gold)" }}>{arquetipo.titulo}</span>
      <h2 className="font-display" style={{ fontSize: "var(--fs-2xl)", fontWeight: 300, color: "var(--gold)" }}>
        {arquetipo.nome}
      </h2>
      <p className="font-body" style={{ fontSize: "var(--fs-base)", color: "var(--text-secondary)", lineHeight: 1.8, textAlign: "left" }}>
        {arquetipo.leitura}
      </p>
      <p className="font-body" style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", textAlign: "left" }}>
        {arquetipo.convite}
      </p>
      <Link to="/checkout/sete-manhas" className="btn-gold">
        Começar o Sete Manhãs
      </Link>
      <Link to="/" className="font-body interactive" style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
        Voltar ao início
      </Link>
    </article>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
npx vitest run src/components/quiz/__tests__/quiz.test.tsx
```

Expected: PASS, 8 testes. (O `ResultadoCard` usa `Link` — envolva os testes dele em `MemoryRouter` se o runner reclamar; siga o padrão dos testes do storefront.)

- [ ] **Step 5: Commit**

```bash
git add src/components/quiz
git commit -m "feat(bussola): componentes do quiz — progresso, pergunta, email e resultado"
```

---

### Task 5: Página, rota e persistência

**Files:**
- Create: `src/pages/BussolaPage.tsx`
- Modify: `src/App.tsx` (rota `/bussola` junto das públicas, ~linha 191)
- Test: `src/pages/__tests__/BussolaPage.test.tsx`

**Interfaces:**
- Consumes: tudo das Tasks 2–4; `supabase` de `@/lib/supabase`; `fireEventAsync` de `@/lib/sequenzy` (assinatura: `fireEventAsync(event: string, options: { email?: string; properties?: Record<string, unknown> })`)
- Produces: rota pública `/bussola` — destrava o gate de merge nº 3

- [ ] **Step 1: Escrever os testes**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const insert = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/lib/supabase", () => ({ supabase: { from: () => ({ insert }) } }));
vi.mock("@/lib/sequenzy", () => ({ fireEventAsync: vi.fn() }));

import BussolaPage from "@/pages/BussolaPage";
import { PERGUNTAS } from "@/content/bussola";

const renderPage = () => render(<MemoryRouter><BussolaPage /></MemoryRouter>);

async function responderTudo(pilarIndex: number) {
  // clica sempre na opcao do mesmo pilar para um resultado deterministico
  for (let i = 0; i < PERGUNTAS.length; i++) {
    const opcao = PERGUNTAS[i].opcoes[pilarIndex];
    await userEvent.click(await screen.findByRole("button", { name: opcao.texto }));
  }
}

beforeEach(() => {
  sessionStorage.clear();
  insert.mockClear();
});

describe("BussolaPage", () => {
  it("comeca na intro com um unico botao de iniciar", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /começar/i })).toBeInTheDocument();
  });

  it("fluxo completo: 12 respostas -> email -> resultado gravado", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /começar/i }));
    await responderTudo(2); // sempre ativacao

    // portao de email ANTES do resultado
    expect(screen.queryByText("A Represada")).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox"), "maria@exemplo.com");
    await userEvent.click(screen.getByRole("button", { name: /ver meu resultado/i }));

    // resultado certo para 12x ativacao
    expect(await screen.findByText("A Represada")).toBeInTheDocument();

    // gravou com email, respostas e resultado
    await waitFor(() => expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "maria@exemplo.com",
        pain_primary: "ativacao",
        social_archetype: "A Represada",
      })
    ));
  });

  it("falha ao gravar NAO bloqueia o resultado (spec §6)", async () => {
    insert.mockResolvedValueOnce({ error: { message: "boom" } });
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /começar/i }));
    await responderTudo(0); // sempre consciencia
    await userEvent.type(screen.getByRole("textbox"), "maria@exemplo.com");
    await userEvent.click(screen.getByRole("button", { name: /ver meu resultado/i }));
    expect(await screen.findByText("A Adormecida")).toBeInTheDocument();
  });

  it("retoma do meio apos reload (sessionStorage)", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /começar/i }));
    // responde 3 perguntas
    for (let i = 0; i < 3; i++) {
      await userEvent.click(await screen.findByRole("button", { name: PERGUNTAS[i].opcoes[0].texto }));
    }
    // simula reload
    screen.unmount?.();
    document.body.innerHTML = "";
    renderPage();
    // deve estar na pergunta 4, nao na intro
    expect(await screen.findByRole("heading", { name: PERGUNTAS[3].texto })).toBeInTheDocument();
  });
});
```

(Se `screen.unmount` não existir na versão da Testing Library, use o `unmount` retornado pelo `render` — ajuste mecânico permitido.)

- [ ] **Step 2: Rodar e ver falhar** — módulo não existe.

- [ ] **Step 3: Implementar `src/pages/BussolaPage.tsx`**

```tsx
/**
 * Bussola da Espiral — diagnostico gratuito de 12 perguntas.
 * Fluxo: intro -> perguntas -> email (ANTES do resultado) -> resultado.
 *
 * Persistencia: progresso parcial em sessionStorage (spec §6 — nada no banco
 * antes do email). A gravacao acontece UMA vez, no confirm do email; falha de
 * banco nao bloqueia o resultado.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fireEventAsync } from "@/lib/sequenzy";
import { calcularResultado, type Pilar, type RespostaQuiz } from "@/lib/bussola";
import { PERGUNTAS, ARQUETIPOS, CONTENT_VERSION } from "@/content/bussola";
import { QuizProgress } from "@/components/quiz/QuizProgress";
import { QuizQuestion } from "@/components/quiz/QuizQuestion";
import { EmailGate } from "@/components/quiz/EmailGate";
import { ResultadoCard } from "@/components/quiz/ResultadoCard";

type Fase = "intro" | "perguntas" | "email" | "resultado";

const STORAGE_KEY = "bussola:v1";

interface EstadoSalvo {
  respostas: RespostaQuiz[];
}

function carregarEstado(): EstadoSalvo | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EstadoSalvo;
    if (!Array.isArray(parsed.respostas)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function BussolaPage() {
  const salvo = carregarEstado();
  const [respostas, setRespostas] = useState<RespostaQuiz[]>(salvo?.respostas ?? []);
  const [fase, setFase] = useState<Fase>(() => {
    if (!salvo || salvo.respostas.length === 0) return "intro";
    return salvo.respostas.length >= PERGUNTAS.length ? "email" : "perguntas";
  });
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ respostas }));
    } catch {
      /* sessionStorage cheio/indisponivel nao pode quebrar o quiz */
    }
  }, [respostas]);

  const indiceAtual = respostas.length;
  const resultado = calcularResultado(respostas);
  const arquetipo = ARQUETIPOS[resultado.pilar];

  function handleResposta(opcaoId: string, pilar: Pilar) {
    const nova: RespostaQuiz = { questionId: PERGUNTAS[indiceAtual].id, pilar };
    const todas = [...respostas, nova];
    setRespostas(todas);
    if (todas.length >= PERGUNTAS.length) {
      setFase("email");
    }
    void opcaoId; // registrado nas respostas cruas via questionId+pilar
  }

  async function handleEmail(email: string) {
    setEnviando(true);

    const { error } = await supabase.from("quiz_responses").insert({
      email,
      answers: respostas,
      pain_primary: resultado.pilar,
      social_archetype: arquetipo.nome,
      content_version: CONTENT_VERSION,
    });

    if (error) {
      // Spec §6: a visitante VE o resultado mesmo assim; a falha fica no log.
      console.error("[bussola] falha ao gravar resposta:", error.message);
    }

    fireEventAsync("bussola.completed", {
      email,
      properties: {
        pain_primary: resultado.pilar,
        social_archetype: arquetipo.nome,
        content_version: CONTENT_VERSION,
        saved: !error,
      },
    });

    sessionStorage.removeItem(STORAGE_KEY);
    setEnviando(false);
    setFase("resultado");
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "var(--space-16) var(--space-5)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "grid", gap: "var(--space-8)" }}>
        {fase === "intro" && (
          <section style={{ textAlign: "center", display: "grid", gap: "var(--space-5)" }}>
            <span className="overline" style={{ color: "var(--gold)" }}>Bússola da Espiral</span>
            <h1 className="font-display" style={{ fontSize: "var(--fs-display)", fontWeight: 300, color: "var(--text-primary)" }}>
              Em que volta da espiral você está presa?
            </h1>
            <p className="font-body" style={{ fontSize: "var(--fs-base)", color: "var(--text-secondary)" }}>
              12 perguntas, 3 minutos. No fim, você descobre qual dos 4 pilares está
              travando a sua vida hoje — e a primeira chave para subir de nível.
            </p>
            <button type="button" className="btn-gold" onClick={() => setFase("perguntas")} style={{ justifySelf: "center" }}>
              Começar
            </button>
          </section>
        )}

        {fase === "perguntas" && indiceAtual < PERGUNTAS.length && (
          <section style={{ display: "grid", gap: "var(--space-8)" }}>
            <QuizProgress atual={indiceAtual + 1} total={PERGUNTAS.length} />
            <QuizQuestion pergunta={PERGUNTAS[indiceAtual]} onResponder={handleResposta} />
          </section>
        )}

        {fase === "email" && <EmailGate onConfirmar={handleEmail} enviando={enviando} />}

        {fase === "resultado" && <ResultadoCard arquetipo={arquetipo} />}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Adicionar a rota**

Em `src/App.tsx`: lazy import junto dos demais e rota pública junto de `/mapa` (~linha 191):

```tsx
const BussolaPage = React.lazy(() => import("@/pages/BussolaPage"));
```

```tsx
<Route path="/bussola" element={<BussolaPage />} />
```

- [ ] **Step 5: Rodar e ver passar**

```bash
npx vitest run src/pages/__tests__/BussolaPage.test.tsx && npm test
```

Expected: os 4 novos passam; suíte total sem novas falhas (33 pré-existentes seguem 33).

- [ ] **Step 6: Commit**

```bash
git add src/pages/BussolaPage.tsx src/App.tsx src/pages/__tests__/BussolaPage.test.tsx
git commit -m "feat(bussola): pagina /bussola com fluxo completo e retomada por sessionStorage

Destrava o gate de merge n.3: o CTA da home deixa de apontar para 404."
```

---

### Task 6: O card da Bússola na vitrine

O produto `bussola-da-espiral` está no catálogo com preço 0. Quando `disponivel`, o card não pode mandar para `/checkout/bussola-da-espiral` (checkout de R$ 0) — manda para `/bussola`.

**Files:**
- Modify: `src/components/storefront/ProductCard.tsx`
- Test: `src/components/storefront/__tests__/ProductCard.test.tsx` (adicionar casos)

**Interfaces:**
- Consumes: `StorefrontProduct` (inalterado)
- Produces: comportamento novo do card para produto gratuito

- [ ] **Step 1: Adicionar os testes**

```tsx
it("produto gratuito disponivel linka para /bussola, nao para checkout", () => {
  renderCard({ ...base, slug: "bussola-da-espiral", price: 0, status: "disponivel" });
  const cta = screen.getByRole("link", { name: /fazer o diagnóstico/i });
  expect(cta).toHaveAttribute("href", "/bussola");
  expect(screen.queryByRole("link", { name: /quero começar/i })).not.toBeInTheDocument();
});

it("produto gratuito mostra 'Gratuito' no lugar do preco e sem parcelamento", () => {
  renderCard({ ...base, slug: "bussola-da-espiral", price: 0, status: "disponivel" });
  expect(screen.getByText("Gratuito")).toBeInTheDocument();
  expect(screen.queryByText(/12×/)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar no `ProductCard`**

No bloco `isAvailable` do card, antes do preço/CTA atuais:

```tsx
const isGratuito = product.price === 0;
const ctaHref = isGratuito ? "/bussola" : `/checkout/${product.slug}`;
const ctaLabel = isGratuito ? "Fazer o diagnóstico" : "Quero começar";
```

- Preço: se `isGratuito`, renderizar `<p className="font-display" ...>Gratuito</p>` no lugar de `formatBRL`; parcelamento e "Garantia de 7 dias" não aparecem para gratuito.
- CTA: `<Link to={ctaHref} className="btn-gold">{ctaLabel}</Link>`.

(Sim, `/bussola` fica implícito para *qualquer* produto de preço 0 — hoje só existe um, e regra por preço é mais honesta que regra por slug embutido. Se um segundo gratuito surgir com outro destino, promove-se a decisão para uma coluna `cta_url`. YAGNI até lá.)

- [ ] **Step 4: Rodar e ver passar** — os 2 novos + os antigos do card.

- [ ] **Step 5: Commit**

```bash
git add src/components/storefront/ProductCard.tsx src/components/storefront/__tests__/ProductCard.test.tsx
git commit -m "feat(storefront): produto gratuito linka para /bussola em vez de checkout"
```

---

## Pendências que este plano NÃO resolve

1. **Aprovação do conteúdo.** `CONTEUDO_PROVISORIO = true` até a Sunyan revisar as 12 perguntas e os 4 arquétipos. O quiz funciona, mas não deve ser divulgado antes disso.
2. **Áudio de devolutiva e PDF do retrato** (spec §3.1): dependem de produção da Sunyan. O `ResultadoCard` ganha os slots quando existirem os arquivos.
3. **Migração do MapaDoPoder para os componentes de `src/components/quiz/`** — desvio declarado; exige antes testes de caracterização do MapaDoPoder.
4. **Associação retroativa**: visitante que faz o quiz e SÓ DEPOIS cria conta não herda a segmentação (o trigger só cobre usuária já existente). Resolver junto do fluxo de registro num plano futuro.
5. **Migração `20260801_000001` não aplicada** — mesma fila das outras duas, decisão do dono.
