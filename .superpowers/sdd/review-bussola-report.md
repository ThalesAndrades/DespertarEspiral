# Review adversarial — leva "Bússola da Espiral" (`feat/fase-0-esteira`, base `1cba0b2`)

**Data:** 2026-08-01 · **Escopo:** 6 commits (`8beda47`..`b51131d`), 15 arquivos, +867/−7
**Spec:** `docs/superpowers/specs/2026-07-31-fase-0-esteira-design.md` §3.1, §4, §6
**Plano:** `docs/superpowers/plans/2026-08-01-bussola-da-espiral.md`

## Veredito: **REPROVADO**

2 Critical quebram, em produção, exatamente as duas coisas que a Bússola existe para
fazer: **capturar o lead** e **levar ao Sete Manhãs**. Ambos os defeitos são silenciosos
(nenhum erro visível para a visitante, nenhum teste vermelho) e ambos têm correção
pequena e localizada. Os testes da leva passam (35/35 nos 5 arquivos tocados) — eles
provam o que o código faz, não o que o sistema faz.

| Severidade | Qtd |
|---|---|
| Critical | 2 |
| Important | 7 |
| Minor | 10 |

---

## Critical

### C1 — O e-mail capturado NUNCA chega na plataforma de e-mail (401 silencioso)

**Arquivos:** `src/pages/BussolaPage.tsx:86` · `supabase/functions/sequenzy-event/index.ts:21-33,96-99`

`BussolaPage` dispara `fireEventAsync("bussola.completed", ...)`. A edge function
`sequenzy-event` só aceita evento anônimo se ele estiver no allowlist `PUBLIC_EVENTS`
(linhas 21-33). `bussola.completed` **não está lá**. Para uma visitante anônima — que é
100% do público-alvo do quiz — não há `Authorization` header, então:

```
if (!PUBLIC_EVENTS.has(event)) {
  if (!authHeader) return json(401, { error: "Authorization required for this event" });
```

→ 401. E `fireEvent` engole o erro: `if (error && import.meta.env.DEV) console.warn(...)`
(`src/lib/sequenzy.ts:46`). **Em produção não há nem log.**

Consequência concreta: mulher faz as 12 perguntas, entrega o e-mail, vê o resultado — e
o e-mail dela não vira contato, não recebe tag, não entra em sequência, não recebe nada.
Zero leads capturados, sem nenhum sinal de que algo falhou. O `EVENT_TAGS` (linha 36)
também não tem entrada para `bussola.completed`, então mesmo autenticado o evento não
etiquetaria nada — a segmentação prometida pela spec §4 não sai do banco.

O padrão certo já existe no repo e não foi seguido: `src/components/features/QuizSection.tsx:174`
usa `lead.diagnostic_completed`, que **está** no allowlist e **tem** tags mapeadas.

**Correção:** adicionar `bussola.completed` a `PUBLIC_EVENTS` **e** a `EVENT_TAGS`
(ex.: `add: ["lead", "diagnostico-bussola", "arquetipo-<pilar>"]`), e redeployar a função.
Enquanto isso não for feito, `/bussola` não pode ser divulgada.

### C2 — O único CTA do resultado é um beco sem saída que joga a visitante no /login

**Arquivos:** `src/components/quiz/ResultadoCard.tsx:21` · `src/pages/CheckoutPage.tsx:73,93-95` · `src/App.tsx:170` · `supabase/migrations/20260731_000002_seed_esteira.sql:17`

`ResultadoCard` fecha com `<Link to="/checkout/sete-manhas">`. Mas o seed da esteira cria
`sete-manhas` com `status = 'em_breve'` (correto — não existe conteúdo ainda), e o
`CheckoutPage` filtra:

```ts
supabase.from("products").select("*").eq("slug", slug).eq("is_active", true).eq("status","disponivel").single()
...
} else { toast.error("Produto não encontrado."); navigate("/products"); }
```

`/products` é `PrivateRoute` (`App.tsx:170`) → visitante anônima é redirecionada para
`/login?next=/products`.

Cenário completo: ela responde 12 perguntas, entrega o e-mail, lê o arquétipo, clica em
"Começar o Sete Manhãs" — e cai numa **tela de login com um toast de erro vermelho**.
É o momento exato da conversão, num site que vende R$ 997, e ele termina em erro.

Isso também fura a regra dura da spec §3.6 ("`em_breve` nunca aceita pagamento e um
produto sem conteúdo não pode ser comprado por engano") pela porta dos fundos: o CTA
existe, só não funciona.

**Correção:** o CTA do resultado deve ser condicional ao status real do produto
(consultar `products`), com fallback para "avise-me quando abrir" (`launch_waitlist` com
`product_id`, que já existe) ou para a vitrine da home. Nunca um link fixo para o
checkout de um produto `em_breve`.

---

## Important

### I1 — `quiz_responses` nasce sem SELECT: a spec §4 pede admin, e ninguém consegue ler

**Arquivo:** `supabase/migrations/20260801_000001_bussola.sql:26-31`

A spec §4 é explícita: "`quiz_responses` aceita INSERT anônimo e **SELECT apenas para
admin**". A migração cria só a policy de INSERT. Com RLS ligada e nenhuma policy de
SELECT, o resultado é *deny-all* para `anon` e `authenticated` — inclusive para a Sunyan
logada como admin. O comentário da migração ("SELECT so para service_role/admin via
painel") descreve uma coisa que o SQL não faz: o painel admin do site usa a mesma anon
key, não service_role.

O padrão existe e não foi usado: `public.is_admin()` (`20260414_000001_production_rls.sql:1`),
aplicado em 8 policies do repo como `using (... or public.is_admin())`. E a leva anterior
até documentou essa armadilha: *"Sem esta politica, anon recebe 0 linhas sem erro"*
(`20260731_000001_storefront.sql:38-39`).

Somado ao fato de que `quiz_responses` **não é lida por nenhum código** (único
referenciador no repo é o INSERT em `BussolaPage.tsx:73`), a tabela é hoje write-only:
o dado que justifica a feature entra e não sai.

### I2 — Envenenamento da segmentação de qualquer usuária, via INSERT anônimo + trigger SECURITY DEFINER

**Arquivo:** `supabase/migrations/20260801_000001_bussola.sql:29-31,42-67`

A policy é `for insert to anon, authenticated with check (true)` — zero validação. O
trigger `quiz_backfill_profile` roda como *owner* (SECURITY DEFINER), ignora RLS, procura
em `auth.users` pelo e-mail **fornecido pelo atacante** e escreve no perfil da dona daquele
e-mail.

Ataque viável (a anon key é pública, está no bundle):

```
POST /rest/v1/quiz_responses
{ "email": "sunyan@despertarespiral.com", "answers": [], 
  "pain_primary": "<qualquer texto>", "social_archetype": "<qualquer texto>" }
```

→ o perfil da vítima passa a ter `pain_primary`/`social_archetype` escolhidos pelo
atacante, com `archetype_at` atualizado. Não é escalada de privilégio (o UPDATE é
limitado a 3 colunas, `where id = uid`, sem SQL dinâmico) e não vaza dado (não há retorno
que diga se o e-mail existe). **O dano é de negócio:** a segmentação que vai comandar os
e-mails da esteira pode ser reescrita em massa por qualquer um, e como não há
`check` constraint em `pain_primary`/`social_archetype`, o texto gravado é arbitrário —
ele será renderizado no CRM admin e usado em personalização de e-mail.

Agravantes na mesma policy:
- **Sem limite de volume:** nenhum rate limit, nenhum índice único (compare com
  `uniq_waitlist_email_product`, `20260731_000001_storefront.sql:34`). Um script grava
  milhões de linhas.
- **Sem limite de tamanho:** `answers jsonb not null` aceita qualquer payload; nada exige
  12 itens nem valida o formato.
- **Sem `check (pain_primary in ('consciencia','reconexao','ativacao','integracao'))`,**
  embora a leva anterior tenha feito exatamente isso para `products.status`.

**Mitigação mínima:** `check` constraints nos dois campos e no tamanho de `answers`;
índice único parcial ou janela anti-flood; e o trigger só atualizar o perfil quando ele
ainda não tiver arquétipo **ou** quando `auth.uid()` bater com o dono do e-mail.

### I3 — Falha ao gravar = lead perdido para sempre (spec §6 pede reprocessamento)

**Arquivo:** `src/pages/BussolaPage.tsx:80-96`

A spec §6 diz: "Falha ao gravar segmentação: não bloqueia o resultado. A visitante vê seu
arquétipo; **a falha é registrada para reprocessamento**." A implementação cumpre a
primeira metade e joga fora a segunda: em caso de erro, faz `console.error` e, na linha 96,
`sessionStorage.removeItem(STORAGE_KEY)` — apaga e-mail e respostas. Não há fila, retry
nem persistência local do que falhou.

Cenário real e provável: a migração `20260801_000001` **não foi aplicada** (pendência 5 do
plano). Se a branch for mergeada e deployada antes disso, o INSERT retorna
`relation "quiz_responses" does not exist` para 100% das visitantes; somado ao C1, o lead
desaparece integralmente — não fica no banco, não fica no Sequenzy, não fica no navegador.

### I4 — `CONTEUDO_PROVISORIO` é decorativo: o "gate de publicação" não existe

**Arquivo:** `src/content/bussola.ts:9`

A flag é declarada com um comentário forte ("O quiz NAO deve ser divulgado enquanto isto
for true") e **não é lida em lugar nenhum** — `grep -rn CONTEUDO_PROVISORIO src/` retorna
uma única linha, a própria declaração. Nenhum teste a assere, a página não a consulta, e
não há `noindex`.

Consequência: no merge, `/bussola` fica pública e indexável com 12 perguntas e 4 leituras
de arquétipo que a Sunyan ainda não revisou, num site de marca. O gate prometido é uma
constante morta.

**Correção:** ou a flag governa alguma coisa (banner de rascunho + `<meta name="robots"
content="noindex">` + teste que falha se `CONTEUDO_PROVISORIO === true` e a rota estiver
linkada da vitrine), ou ela sai e a pendência vira bloqueio de merge explícito.

### I5 — A retomada por sessionStorage não é versionada pelo conteúdo → respostas corrompidas

**Arquivo:** `src/pages/BussolaPage.tsx:21,27-38,44-46`

A chave é fixa (`"bussola:v1"`) e o estado salvo guarda só `respostas`, sem `CONTENT_VERSION`.
Como o conteúdo é declaradamente provisório e **vai** mudar quando a Sunyan aprovar, o
cenário é concreto:

1. Visitante responde 5 perguntas e fecha a aba (sessão viva).
2. Deploy troca/reordena as perguntas (mesmo `PERGUNTAS.length`).
3. Ela volta: retoma no índice 5 das **novas** perguntas; as 5 respostas salvas carregam
   `questionId` de perguntas que ela nunca viu nesse texto.
4. Grava-se uma linha com `content_version: "v2"` e `answers` que misturam duas versões.

A tabela existe justamente para "recalibrar o quiz depois" (spec §4); esse registro é
ruído indistinguível de dado bom. O gasto para evitar é uma linha: chave
`bussola:${CONTENT_VERSION}` (ou descartar o estado salvo se a versão não bater).

Nota de validação: a preocupação de estouro **não** se confirma. Se `PERGUNTAS` encolher,
`indiceAtual = respostas.length` não quebra — a fase inicial é `"email"` quando
`respostas.length >= PERGUNTAS.length` (linha 45) e o único deref de `PERGUNTAS[indiceAtual]`
está atrás da guarda `indiceAtual < PERGUNTAS.length` (linha 120). Verificado.

### I6 — `price === 0 → /bussola`: a regra acopla roteamento a preço

**Arquivo:** `src/components/storefront/ProductCard.tsx:19-22`

`const isGratuito = product.price === 0; const ctaHref = isGratuito ? "/bussola" : ...`.
O slug é ignorado. Qualquer segundo produto gratuito — uma isca nova, um bônus liberado,
o "Mapa dos Sentimentos" virando brinde de campanha — passa a mandar a visitante para o
diagnóstico da Bússola em vez da própria página. O card também some com "Garantia de 7
dias" para todo gratuito (linha 81), o que é certo por acaso, não por regra.

**Correção:** decidir pelo `slug` (`product.slug === "bussola-da-espiral"`) ou, melhor,
por uma coluna explícita de destino/`kind` no `products` — o mesmo caminho que a spec §4
já adotou para `status`, `promise`, `highlights`.

### I7 — O card da Bússola é inalcançável com o dado de produção atual

**Arquivos:** `src/components/storefront/ProductCard.tsx:17,66` · `supabase/migrations/20260731_000002_seed_esteira.sql:12-14`

O ramo gratuito inteiro vive dentro de `isAvailable ? (...) : <botão avise-me>`, e
`isAvailable = product.status === "disponivel"`. O seed cria `bussola-da-espiral` com
`status = 'em_breve'`. Ou seja: hoje o card renderiza **"Avise-me quando abrir"** e o link
para `/bussola` nunca aparece — a entrega "card gratuito → /bussola" não acontece na
vitrine real.

Os dois testes novos passam porque a fixture força `status: "disponivel"`
(`ProductCard.test.tsx:417,424`) — testam a função, não o sistema. Nada na leva vira o
status, e nada documenta que é preciso virar. Junto com o C2, `/bussola` só é alcançável
por URL direta.

---

## Minor

- **M1 — `set search_path = public` (migração:47).** *Validado: está correto para o que a
  função faz.* `auth.users` e `public.user_profiles` estão qualificados por schema, então
  o search_path não participa da resolução; `lower()` vem de `pg_catalog` (que é
  pesquisado implicitamente e não é sequestrável via `pg_temp`, pois `pg_temp` só é
  consultado para relações/tipos, nunca para funções). Não há SQL dinâmico. Hardening
  recomendado mesmo assim, por convenção Supabase: `set search_path = ''` com tudo
  qualificado, ou `= pg_catalog, public`.
- **M2 — `prefers-reduced-motion` não respeitado** (`src/components/quiz/QuizProgress.tsx:25`).
  A barra anima `width` por `var(--dur-slow)` (600ms) via style inline num `div` sem
  classe. O bloco de redução (`src/index.css:1226-1232`) é *class-scoped* (`.interactive`,
  `.btn-gold`, `.card-lift`…), não `*` — logo não cobre esse elemento. Fere a constraint
  global do plano.
- **M3 — Sem `<Helmet>`** em `BussolaPage.tsx`. `LandingPage.tsx:277` e `CheckoutPage.tsx:208`
  seguem o padrão; a página pública nova entra sem `<title>`, sem description, sem
  canonical — e sem o `noindex` que o conteúdo provisório pediria (ver I4).
- **M4 — Acessibilidade:** durante as fases `perguntas`/`email`/`resultado` a página fica
  **sem `<h1>`** (só a intro tem, `BussolaPage.tsx:129`); o `<p role="alert">` de erro do
  `EmailGate.tsx:44` não é ligado ao input por `aria-describedby`; o input não declara
  `autoComplete="email"`.
- **M5 — Sem voltar/corrigir resposta.** Não há botão de retorno; um clique errado na
  pergunta 3 é definitivo até limpar a sessão. A spec §3.1 aponta o motor do MapaDoPoder
  (com navegação) como base.
- **M6 — `setRespostas([...respostas, nova])` com closure velha** (`BussolaPage.tsx:62-63`).
  Sem forma funcional (`setRespostas(prev => ...)`), um duplo disparo do mesmo evento
  descarta uma resposta silenciosamente em vez de avançar. Baixo risco, custo zero de
  corrigir.
- **M7 — Estilo inline brigando com o design system.** `QuizQuestion.tsx:13-16` aplica
  `className="card-dark interactive"` e em seguida sobrescreve `background: var(--card-bg)`
  e `border` no inline; `ResultadoCard.tsx:10` usa `var(--gold-dim, var(--gold))` embora
  `--gold-dim` exista (`src/index.css:15`) e seja usado sem fallback no `ProductCard`.
  Todos os tokens citados na leva foram conferidos e existem — o problema é duplicação de
  fonte de verdade, não token inventado.
- **M8 — `answers` não guarda a opção escolhida** (`BussolaPage.tsx:68`, `void opcaoId`).
  Hoje é recuperável porque cada pergunta tem exatamente uma opção por pilar (garantido
  por `bussola.content.test.ts`), mas vira perda de dado silenciosa no dia em que uma
  pergunta tiver duas opções do mesmo pilar. Gravar `opcaoId` custa um campo.
- **M9 — LGPD:** o portão de e-mail (`EmailGate.tsx`) não tem checkbox de consentimento
  nem link para `/privacidade` (rota que existe, `App.tsx`). É lacuna do site inteiro, não
  regressão desta leva — mas é uma captura nova de dado pessoal para fins de marketing.
- **M10 — Higiene em `BussolaPage.tsx:40 e 32`:** `carregarEstado()` roda a cada render
  embora só o primeiro resultado seja usado (mover para o initializer de `useState`); e a
  validação do estado salvo checa só `Array.isArray(parsed.respostas)`, sem validar os
  elementos. *Verificado que não quebra:* um `pilar` inválido cria um bucket `NaN` em
  `pontos` e `NaN > n` é sempre falso, então `calcularResultado` continua devolvendo um
  pilar válido e `ARQUETIPOS[pilar]` nunca é `undefined`.

---

## O que foi verificado e está correto

- **Pontuação (`src/lib/bussola.ts`).** `calcularResultado` bate com os testes e com a
  spec §6. O desempate é o da spec: `PILAR_ORDEM = [consciencia, reconexao, ativacao,
  integracao]`, vencedor inicializado em `PILAR_ORDEM[0]` e comparação com `>` estrito —
  logo o primeiro da ordem vence qualquer empate, inclusive o quádruplo. Puro,
  determinístico, sem `Date`/`Math.random`, e lista vazia não lança.
- **Não dá para ver o resultado sem e-mail válido nem pular perguntas.** A fase
  `resultado` só é alcançada por `handleEmail`, que só roda depois do regex do `EmailGate`;
  a fase `email` só por 12 respostas ou por estado salvo com ≥12. Adulterar o próprio
  `sessionStorage` pula perguntas, mas continua caindo no portão de e-mail — sem ganho
  para o atacante (é o próprio navegador dele).
- **Nada é gravado no banco antes do e-mail** (spec §6) e a falha de gravação não bloqueia
  o resultado — confirmado por teste (`BussolaPage.test.tsx`, caso "boom").
- **Trigger sem injeção.** Sem SQL dinâmico, UPDATE restrito a 3 colunas e `where id = uid`.
- **Suíte da leva verde:** 35/35 nos 5 arquivos tocados (`vitest run`), sem novas falhas
  no baseline dos arquivos alterados.
- **Todos os tokens CSS usados existem** em `src/index.css` (`--bg-surface-3`, `--input-bg`,
  `--input-border`, `--rose`, `--gold-dim`, `--fs-display`, `--dur-slow`, `--ease-out`,
  `--r-xl`, `--space-16`, `--card-bg`, `--border-subtle`), assim como as classes
  `.card-dark`, `.btn-gold`, `.overline`, `.font-display`, `.font-body`, `.interactive`.
  Copy em pt-BR, sem hex solto, sem `cubic-bezier` inline.
- **Desvio declarado (não extrair o motor do `MapaDoPoder`) é defensável:** o arquivo tem
  1057 linhas, zero testes e serve evento em produção por QR. Registrado como pendência 3.

---

## Ordem sugerida de correção antes de re-review

1. C1 (allowlist + tags no `sequenzy-event`) — sem isso a feature não tem função.
2. C2 (CTA do resultado condicional ao status do produto).
3. I1 + I2 (policy de SELECT admin, `check` constraints, endurecer o trigger) — na mesma
   migração, que ainda não foi aplicada.
4. I3, I4, I5 (retry/persistência da falha, gate real de conteúdo, chave de sessão
   versionada).
5. I6 + I7 (roteamento por slug e decisão explícita sobre o `status` da Bússola no seed).

---

## Fixes aplicados

Branch `feat/fase-0-esteira`. Todos os 8 fixes prescritos foram aplicados.

- **C1** — `bussola.completed` adicionado a `PUBLIC_EVENTS` em
  `supabase/functions/sequenzy-event/index.ts` (com comentário explicando o
  disparo anônimo). **Não foi adicionada entrada em `EVENT_TAGS`** — fora do
  escopo prescrito para este fix; a etiquetagem do evento continua pendente.
  ⚠️ **Requer `supabase functions deploy sequenzy-event`** antes de valer em
  produção — mesmo gate das demais edge functions.
- **C2(a)** — `CheckoutPage.tsx`: "produto não encontrado" agora navega para
  `/` em vez de `/products` (rota privada). Bug independente da Bússola.
- **C2(b)** — `ResultadoCard.tsx`: CTA trocado de `/checkout/sete-manhas`
  (produto `em_breve`) para `to="/"` com rótulo "Conhecer o Sete Manhãs" e
  comentário apontando a pendência de reverter quando o produto abrir.
- **I1** — Policy `quiz_responses_admin_read` (SELECT, `to authenticated`,
  `using (public.is_admin())`) adicionada em
  `supabase/migrations/20260801_000001_bussola.sql`. Confirmado que
  `public.is_admin()` (sem argumentos) é a forma usada em
  `20260414_000001_production_rls.sql`.
- **I2** — `check` constraints em `quiz_responses`: `email` (≤254 chars),
  `pain_primary` (enum dos 4 pilares), `social_archetype` (≤60 chars),
  `answers` (`pg_column_size` ≤8192 bytes). Rate-limit de borda continua
  pendência (fora de escopo).
- **I3** — `BussolaPage.tsx`: `sessionStorage.removeItem` só roda quando
  `!error`; em falha de gravação as respostas permanecem salvas para reenvio.
- **I4** — `BussolaPage.tsx`: fase intro renderiza `Versão preliminar` acima
  do título quando `CONTEUDO_PROVISORIO === true`.
- **I5** — `STORAGE_KEY` passou a ser `` `bussola:${CONTENT_VERSION}` ``.
- **I6/I7** — `ProductCard.tsx`: mapa `FREE_ROUTES` por slug substitui a regra
  `price === 0 → /bussola`; gratuito sem entrada no mapa é tratado como
  `em_breve` (avise-me) mesmo que `status` do banco diga `disponivel`.

**Testes ajustados** (consequência direta dos fixes, não escopo novo):
- `CheckoutPage.test.tsx` — 2 asserts de `navigate("/products")` → `navigate("/")`
  no cenário "produto não encontrado" (C2a).
- `ProductCard.test.tsx` — novo caso "gratuito sem rota mapeada mostra
  avise-me, mesmo com status disponivel" (I6/I7).
- `ResultadoCard`/`quiz.test.tsx` — nenhuma mudança necessária; o teste
  existente não asserta o `href` do CTA.

**Verificação:**
- `npm test` (`NODE_OPTIONS=--max-old-space-size=4096`): **578 testes, 545
  passando, 33 falhando** (mesmas 33 do baseline pré-existente — não
  aumentou; o total subiu em 1 pelo teste novo do ProductCard).
- `npx tsc -p tsconfig.app.json --noEmit`: **35 erros pré-existentes**,
  nenhum nos arquivos tocados por esta leva de fixes.
- Commit único: `fix(review): corrigir achados C1/C2/I1-I7 da revisao da Bussola`.

**Pendências que continuam em aberto (fora do escopo dos 8 fixes):**
- Deploy da edge function `sequenzy-event` (necessário para C1 valer).
- Tag/segmentação de `bussola.completed` em `EVENT_TAGS` (não pedida no fix).
- Rate-limit de borda para `quiz_responses` (I2, mitigação mínima aplicada
  via `check` constraints; volume/flood real fica para a borda).
- Associação retroativa visitante→usuária (fora do escopo original da leva).
