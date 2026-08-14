# Review adversarial — leva "Sete Manhãs" (`feat/fase-0-esteira`)

**Base:** `240eba3` · **Commits:** `f43b271`, `4b83282`, `3d06631`
**Revisor:** revisor final adversarial · **Data:** 2026-08-01
**Escopo:** `src/lib/seteManhas.ts`, `src/components/seteManhas/AnelSeteManhas.tsx`,
`src/pages/CourseViewPage.tsx`, `src/pages/LessonPage.tsx` + 3 arquivos de teste novos.

---

## Veredito

**APROVADO COM CORREÇÕES**

A regra pura está bem desenhada, é determinística, recebe o "hoje" por parâmetro
como manda a Global Constraint, e as bordas de meia-noite / mês / ano / bissexto
estão **corretas** (verificado empiricamente). A integração é cirúrgica e não
regride nenhum outro produto. O que trava a aprovação plena é o **entorno da
trava**: a regra decide certo, mas a UI continua oferecendo 7 caminhos para uma
manhã bloqueada, e todos eles terminam num salto silencioso de volta — inclusive
o botão dourado principal da página, no exato dia em que a aluna conclui a
manhã 1. Isso contraria diretamente o tom "acolhedor, nunca punição" da spec §3.2.

### Contagem por severidade

| Severidade | Qtd |
|---|---|
| Critical | 1 |
| Important | 5 |
| Minor | 8 |
| **Total** | **14** |

### Gates

| Gate | Resultado |
|---|---|
| Suíte completa | **599 testes / 566 passam / 33 falham** — idêntico ao baseline informado (9 arquivos: Community 5, LessonPage 16, email 3, AdminProductContent 3, Dashboard 2, CourseView 1, ProductsPage 1, QuizEditor 1, Register 1). **Nenhuma falha nova.** |
| Testes novos | 21/21 passam (13 lib + 4 anel + 4 integração) |
| Branch | `feat/fase-0-esteira` ✅ (nunca main) |
| Tokens do design system | Todos os 14 tokens usados **existem** em `src/index.css`; nenhum hex literal no código novo ✅ |
| Regressão p/ outros produtos | Nenhuma encontrada (ver §Regressão) |

---

## Critical

### C-1 — Concluir a manhã do dia deixa o botão principal morto, sem nenhuma copy explicando

**Arquivo:** `src/pages/CourseViewPage.tsx:195` + `:306-310` (CTA), com efeito em
`src/pages/LessonPage.tsx:526-541` (a trava).

`nextLesson` (linha 195) é `allLessons.find(l => !completed.has(l.id))` — **não passa
pela trilha**. O CTA dourado do herói (linha 307) aponta para ela sem nenhuma
condicional de `isSeteManhas`.

**Cenário concreto (é o caminho feliz do produto, não uma borda):**

1. Terça, 08h. A aluna abre `/products/sete-manhas`, clica em **"Começar"**, ouve
   a manhã 1, clica em "Marcar como concluída". `markComplete`
   (`LessonPage.tsx:398`) grava `completed_at = hoje`.
2. `autoplayNext` está ligado por padrão → 800 ms depois `LessonPage.tsx:481`
   navega para a manhã 2.
3. A manhã 2 monta, refaz o fetch, `estadoTrilha` devolve `"amanha"` para o
   índice 2 → `<Navigate replace>` (`LessonPage.tsx:538`) joga de volta em
   `/products/sete-manhas`. **Sem toast, sem mensagem, sem nada.**
4. Na trilha, o CTA agora diz **"Continuar"** e aponta para a manhã 2. A aluna
   clica. Bounce de novo. Clica de novo. Bounce de novo.
5. Em nenhum lugar da página existe **texto visível** dizendo *"a manhã 2 abre
   amanhã"*. O anel tem esse texto só em `aria-label` (num `<span>` que é
   `aria-hidden`), e a linha da aula no acordeão só fica com `opacity: 0.55`.

O resultado é o oposto exato do que a spec pede: a aluna termina o ritual do dia
e a interface responde com um botão que não funciona. "Ainda não" virou "quebrado".

**Correção mínima:** (a) para `isSeteManhas`, derivar o CTA da trilha — se a
próxima pendente é `"amanha"`, trocar o botão por uma frase acolhedora
("Sua próxima manhã abre amanhã ✦") em vez de um link; (b) desligar o
`autoplayNext` quando o produto é Sete Manhãs; (c) dar copy **visível** ao
estado `amanha`/`bloqueada` na lista de aulas (hoje só existe opacidade).

---

## Important

### I-1 — A trava tem 7 portas de entrada e só 1 foi fechada

**Arquivos:** `LessonPage.tsx:90`, `:93`, `:481`, `:614`, `:1042`, `:1066`,
`:1094`, `:1113`; `CourseViewPage.tsx:172`, `:307`.

O plano fechou só a lista do acordeão do `CourseViewPage` (`:544-558`). Continuam
clicáveis e levando ao bounce:

| Origem | Linha |
|---|---|
| CTA "Continuar" do herói | `CourseViewPage.tsx:307` (ver C-1) |
| Lista de prévia grátis (tela sem acesso) | `CourseViewPage.tsx:172` (ver I-2) |
| Sidebar/drawer de módulos **dentro da própria aula** | `LessonPage.tsx:614` |
| Botões ‹ Anterior / Próxima › (rodapé desktop e mobile) | `LessonPage.tsx:1066`, `:1113` |
| Navegação por teclado ← / → | `LessonPage.tsx:88-94` |
| Auto-advance | `LessonPage.tsx:481` |

**Cenário:** a aluna está lendo a manhã 2 (liberada), abre o drawer de módulos e
toca em "Manhã 5" por curiosidade. É **ejetada da aula em que estava** para a
página do curso, perdendo a posição de leitura, sem explicação. O `replace`
piora: o botão "voltar" do navegador não a devolve à manhã 2.

A trava está no lugar certo (é a única defesa real contra URL direta), mas
esconder o link só num dos seis lugares transforma os outros cinco em armadilhas.

### I-2 — Prévia grátis de qualquer manhã ≥ 2 vira loop de clique infinito

**Arquivos:** `CourseViewPage.tsx:138-186` (tela sem acesso) × `LessonPage.tsx:495` → `:526`.

Ordem no `LessonPage`: o portão de pagamento (`if (!hasAccess && !isFreePreview)`,
linha 495) roda **antes** da trava do ritmo (linha 526). Logo, **o free-preview
NÃO escapa da trava** — ele cai nela.

**Cenário:** a Sunyan marca `is_free` na "Manhã 3" para usar como isca de
marketing. Uma visitante sem compra abre `/products/sete-manhas`:

1. `CourseViewPage` cai no ramo "Acesso necessário" (`:138`) — que retorna **antes**
   do bloco Sete Manhãs (`:207`), então ela nem vê o anel.
2. O bloco "Prévia gratuita disponível" (`:165-181`) lista a Manhã 3 com badge
   GRÁTIS e link direto para a aula.
3. Ela clica → `LessonPage` passa o portão (`isFreePreview` = true) → chega na
   trava → ela não tem progresso nenhum, então `estadoTrilha` devolve
   `"bloqueada"` para o índice 3 → `<Navigate>` de volta para
   `/products/sete-manhas`.
4. Que é exatamente a tela do passo 2. **Clique → bounce → clique → bounce.**

A prévia grátis fica inalcançável e a landing do produto ganha um link morto.
**Deveria escapar?** Sim — uma aula marcada como prévia é uma decisão comercial
explícita do admin e não faz parte do ritmo de quem comprou. A trava deve ter
`if (isFreePreview) → passa`, ou o `CourseViewPage` deve parar de listar prévias
de posição ≥ 2 para esse produto.

### I-3 — `completed_at` ausente **tranca de volta** uma manhã já concluída (viola "nunca punição")

**Arquivos:** `CourseViewPage.tsx:110-111`, `LessonPage.tsx:199-200`, `seteManhas.ts:263-270`.

Os dois call sites fazem `if (r.completed_at) atMap[r.lesson_id] = r.completed_at`
— uma linha com `completed: true` e `completed_at` nulo é **silenciosamente
descartada**. Para `estadoTrilha`, essa manhã simplesmente nunca foi feita.

**Cenário (verificado rodando a lib real):** aluna com manhãs 1 e 2 concluídas,
mas sem data (linha antiga, import manual do admin, ou qualquer gravação que não
passe pelo `markComplete`). `estadoTrilha([], hoje)` devolve:

```
disponivel, bloqueada, bloqueada, bloqueada, bloqueada, bloqueada, bloqueada
```

A **manhã 2, que ela já concluiu**, volta a `bloqueada`. O acordeão a mostra
cinza e não-clicável, e a URL direta é rejeitada pelo `<Navigate>`. Isso é
exatamente o que a Global Constraint proíbe: *"jamais tranca de novo o que já foi
concluído"*. A única saída é refazer a manhã 1 e esperar mais um dia.

O default está invertido: numa regra cujo princípio é "nunca punição", **dado
faltando tem de destravar, não trancar**. Sugestão: passar também o `Set` de
concluídas e tratar `completed && !completed_at` como concluída em data
desconhecida (ex.: `"1970-01-01"`), o que preserva o acesso e só perde o cálculo
de streak.

*Atenuante honesto:* hoje o único gravador no código é `LessonPage.tsx:405`, que
sempre escreve `completed_at`. O risco é de dado legado/manual — mas
`CertificatePage.tsx:95` já tipa a coluna como `string | null`, o que indica que
o próprio repo considera o nulo possível.

### I-4 — Produto com mais de 7 aulas: as aulas 8+ ignoram a trava por completo

**Arquivos:** `CourseViewPage.tsx:213-221` + `:514-516`, `LessonPage.tsx:527-539`,
`seteManhas.ts:278` (`TOTAL_MANHAS` fixo em 7).

`estadoTrilha` **sempre** devolve 7 itens (verificado). O mapeamento
`posicaoPorLessonId` mapeia **todas** as aulas para 1..N.

- **N > 7** (admin cadastra uma 8ª aula, ou um módulo bônus): para a aula 8,
  `trilhaSeteManhas[7]` é `undefined` → `?.estado` é `undefined` →
  `bloqueadaSeteManhas` é `false` → renderiza como `<Link>` normal; e no
  `LessonPage`, `estadoDesta` é `undefined` → **nenhum redirect**. Resultado:
  a trilha **trunca em 7 e libera geral da 8 em diante**, no dia 1, sem nenhum
  ritmo. Aluna abre a aula 8 antes da manhã 2.
- **N < 7** (só 3 manhãs cadastradas até agora — o produto está `em_breve`):
  o anel renderiza **7 bolinhas mesmo assim**, quatro delas "ainda bloqueada"
  apontando para aulas que não existem. Promessa visual falsa.
- **Múltiplos módulos:** funciona por acidente — `allLessons`
  (`CourseViewPage.tsx:189`) achata na ordem `sort_order` de módulo depois de
  aula, e ambos são ordenados no fetch (`:92-105`), então a posição segue certa.
  Mas nada valida "1 módulo, 7 aulas"; o anel só continua coerente por sorte.

Falta uma guarda: se `allLessons.length !== TOTAL_MANHAS`, ou desliga o modo
Sete Manhãs (fallback para curso comum) ou trata o excedente como bloqueado.

### I-5 — `estadoTrilha` **lança exceção** com `completedAt` malformado

**Arquivo:** `seteManhas.ts:257-261` (`diaSeguinte`) chamado por `:311`.

`dataSP` de uma data inválida **não** lança — devolve a string `"Invalid Date"`.
Mas o laço da "fosca" (`:308-314`) chama `diaSeguinte("Invalid Date")`, que faz
`new Date("Invalid DateT12:00:00.000Z").toISOString()` → **`RangeError: Invalid
time value`**.

Verificado rodando a lib compilada:

```
estadoTrilha("lixo")                  -> THROW RangeError: Invalid time value
estadoTrilha("0000-00-00T00:00:00Z")  -> THROW RangeError: Invalid time value
estadoTrilha("2026-13-45T10:00:00Z")  -> THROW RangeError: Invalid time value
estadoTrilha("")                      -> THROW RangeError: Invalid time value
estadoTrilha(null)                    -> "1969-12-31" (silencioso, sem lançar)
```

Como isso roda **durante o render** do `CourseViewPage` e do `LessonPage`, um
único valor sujo derruba as duas páginas inteiras no `ErrorBoundary`
(`src/App.tsx:140`) — a aluna vê a tela de erro genérica, não o curso.

Os dois call sites atuais filtram valores *falsy*, o que cobre `null`,
`undefined` e `""`. O gatilho realista sobrando é estreito (string não-vazia e
não-parseável vinda do banco). Ainda assim, esta é a função descrita como a
**regra pura e única fonte da verdade de acesso**, exportada para reuso: ela
precisa validar a própria entrada (`Number.isNaN(new Date(iso).getTime())` →
ignorar a conclusão), não confiar no guard-clause de cada chamador.

Observação correlata: `dataSP(null)` devolvendo `"1969-12-31"` (epoch) é pior que
lançar — passa despercebido e marca a manhã como concluída em 1969.

### I-6 — A trava do `LessonPage` não tem **nenhum** teste

**Arquivo:** `src/pages/LessonPage.tsx:521-541`.

O plano proibiu (com razão) mexer no `LessonPage.test.tsx` — que tem 16 falhas
pré-existentes de mock — e resolveu isso testando "a regra nova na lib pura". Mas
a lib pura testa a *regra*; o `<Navigate>` é o *portão*. A única defesa contra
URL direta de uma aula futura foi para produção com cobertura zero: nenhum teste
prova que ele redireciona, que ele **não** redireciona uma manhã liberada, nem
que ele ignora outros produtos.

O caminho aberto era um arquivo novo — `LessonPage.seteManhas.test.tsx` — no
mesmo padrão do `CourseViewPage.seteManhas.test.tsx` que a leva criou, sem
encostar no arquivo quebrado. Não seria caro e é o único trecho de controle de
acesso da leva.

**Boa notícia sobre a corrida:** auditei a ordem de execução e **não há
gravação antes do redirect**. Os efeitos do `LessonPage` (`:65` notas, `:77`
teclado, `:150` fetch, `:327` certificado) são leitura ou estado local; a única
escrita em `lesson_progress` é `markComplete` (`:398`), chamada **apenas** por
`onClick` (`:1056`, `:1102`), e esses botões ficam depois da trava no JSX. O
`<Navigate>` da react-router age no efeito de commit, depois dos efeitos do
componente — e nenhum deles escreve. Também confirmei que **não há hook
top-level depois da trava** (`:541`), então o early return não quebra as Rules
of Hooks. Este ponto do briefing está limpo.

---

## Minor

- **M-1 — `aria-label` em `<div>` sem role é ignorado por leitores de tela.**
  `CourseViewPage.tsx:549-556`: a linha bloqueada é um `<div className="lesson-row"
  aria-label="Manhã 3: ainda bloqueada">`. `div` não tem role implícito, então o
  nome acessível é descartado e o leitor lê só o título da aula — a informação de
  "bloqueada" **não chega** a quem usa leitor de tela. Pior: o teste
  (`CourseViewPage.seteManhas.test.tsx:921`) passa, porque
  `getAllByLabelText` consulta o atributo, não a árvore de acessibilidade — dá
  confiança falsa. Usar `role="listitem"`/`<li>` ou mover o texto para um
  `<span className="sr-only">`.

- **M-2 — Estado bloqueado é comunicado só por opacidade.** Mesma linha: o único
  sinal visual é `opacity: 0.55`. Sem ícone, sem texto, sem cadeado. Falha de
  WCAG 1.4.1 e, mais grave para este produto, deixa a aluna sem saber *quando*
  abre (ver C-1).

- **M-3 — `.lesson-row:hover` continua ativo na linha não-clicável.**
  `src/index.css:780` pinta o fundo no hover. O inline `cursor: default` mata o
  cursor, mas o realce permanece → afordância falsa de "isto é clicável".

- **M-4 — `prefers-reduced-motion` não cobre o anel.**
  `AnelSeteManhas.tsx:67` usa `transition: opacity var(--dur-base) var(--ease-out)`
  inline. O bloco `@media (prefers-reduced-motion: reduce)` do repo
  (`src/index.css:1226-1233`) é **escopado por classe** (`.btn-gold`, `.reveal`,
  `.card-lift`…) e não alcança estilo inline em componente novo. A Global
  Constraint pede `prefers-reduced-motion` explicitamente. Impacto real é baixo
  (fade de opacidade), mas é a constraint literal.

- **M-5 — `new Date().toISOString()` dentro do render.**
  `CourseViewPage.tsx:214` e `LessonPage.tsx:534`. Torna o render impuro (valor
  novo a cada re-render) e, na prática, significa que **a página aberta atravessa
  a meia-noite sem se atualizar**: a aluna que deixou a trilha aberta às 23h50
  continua vendo "abre amanhã" às 00h05, quando já abriu. Um `useState(() =>
  new Date().toISOString())` + revalidação por foco resolveria.

- **M-6 — Recomputo a cada render sem memo.** `estadoTrilha`/`streakAtual` rodam
  em todo render do `CourseViewPage` (`:212-222`) e do `LessonPage` (`:526-541`).
  Custo trivial (7 itens), mas junto com M-5 é o mesmo defeito de fundo: cálculo
  de data no corpo do componente.

- **M-7 — Empate de `sort_order` deixa a identidade da manhã instável.** A ordem
  vem de `Array.sort` estável sobre a ordem que o PostgREST devolveu, que não tem
  `ORDER BY` garantido. Duas aulas com o mesmo `sort_order` podem trocar de
  posição entre dois carregamentos — e com elas, qual manhã está liberada.

- **M-8 — Rótulos duplicados entre anel e lista.** "Manhã 3: ainda bloqueada"
  aparece nos dois lugares com texto idêntico (o próprio teste precisa de
  `getAllByLabelText`). Numa navegação por leitor de tela soa como repetição.
  O comentário do plano já previa a duplicação de texto; vale ao menos
  diferenciar ("Ponto 3 da jornada" vs. a linha da aula).

---

## Regressão para produtos que **não** são sete-manhas

**Nenhuma encontrada.** Auditoria do diff:

| Mudança | Escopo | Risco |
|---|---|---|
| `.select("lesson_id")` → `.select("lesson_id, completed_at")` | `CourseViewPage.tsx:85`, `LessonPage.tsx:193` — **todos** os produtos | Nulo. A coluna existe e já era lida por `CertificatePage.tsx:75`. Nenhum teste asserta as colunas do `select` (verifiquei). `ProductsPage` e `DashboardPage` não foram tocados. |
| Estado novo `completedAt` | ambas as páginas | Nulo. Só é lido dentro de `if (isSeteManhas)` / `if (slug === SETE_MANHAS_SLUG)`. |
| Bloco da trilha | `CourseViewPage.tsx:207-222` | Guardado por `isSeteManhas`; `trilhaSeteManhas` fica `[]` e `posicaoPorLessonId` vazio para os demais. |
| Linha `<div>` em vez de `<Link>` | `CourseViewPage.tsx:544-558` | Guardado por `bloqueadaSeteManhas`, que só pode ser `true` com `isSeteManhas`. |
| Trava `<Navigate>` | `LessonPage.tsx:526-541` | Guardado por `product.slug === SETE_MANHAS_SLUG`. |
| Import novo de `Navigate` | `LessonPage.tsx:2` | Nulo. |

A suíte confirma: 33 falhas antes, 33 falhas depois, mesmos 9 arquivos.

---

## O que está **certo** (verificado, não presumido)

Compilei `seteManhas.ts` com esbuild e rodei cenários contra a implementação real:

- **Meia-noite de São Paulo:** `dataSP("2026-08-10T02:59:59Z")` → `2026-08-09`;
  `dataSP("2026-08-10T03:00:00Z")` → `2026-08-10`. Fronteira exata em UTC-3. ✅
- **Virada de mês/ano/bissexto:** `diaSeguinte("2026-12-31")` → `2027-01-01`;
  `("2026-02-28")` → `2026-03-01`; `("2028-02-28")` → `2028-02-29`. ✅
  O truque do meio-dia UTC é sólido (e SP nem tem mais horário de verão desde 2019).
- **Nunca punição, no caminho normal:** nenhum estado `bloqueada`/`amanha` é
  atribuído a um índice presente em `porIndice`. Uma manhã com data de conclusão
  válida **nunca** é trancada de novo. A única falha desse princípio é a I-3
  (data ausente) — o dado, não a lógica.
- **Fora de ordem (dado sujo):** `estadoTrilha([manhã 5 feita hoje])` →
  `disponivel, bloqueada, ..., concluida, ...` — a pendente mais antiga abre e a
  concluída fora de ordem é respeitada. Não quebra. ✅
- **Conclusão com data futura** (relógio do cliente adiantado): degrada para
  "amanha" até o tempo alcançar, sem lançar nem trancar retroativamente. ✅
- **Determinismo:** mesmo `hojeISO` → mesma saída (o teste do plano cobre). ✅
- **Design system:** os 14 tokens (`--space-1/3/4/6`, `--r-lg`, `--fs-xs`,
  `--dur-base`, `--ease-out`, `--gold`, `--bg-base`, `--bg-surface-3`,
  `--text-faint`, `--text-muted`, `--border-subtle`) e as 4 classes
  (`card-dark`, `overline`, `font-body`, `lesson-row`) **existem** no CSS.
  Zero hex literal no código novo. ✅
- **pt-BR:** toda a copy visível e todos os rótulos estão em pt-BR, com acentuação
  correta ("concluída", "disponível hoje", "abre amanhã", "ainda bloqueada",
  "Sua jornada", "N dias seguidos") e plural tratado (`1 dia seguido` × `N dias
  seguidos`). Tom sem cobrança: streak zero simplesmente não aparece. ✅
- **Rules of Hooks:** nenhum hook top-level depois do early return da trava. ✅

---

## Correções recomendadas antes do merge

**Bloqueantes (Critical + Important):**

1. Derivar o CTA "Continuar" da trilha e desligar o auto-advance para
   sete-manhas; dar **copy visível** ao estado "abre amanhã". *(C-1)*
2. Fechar — ou pelo menos sinalizar — as outras 6 portas: sidebar do
   `LessonPage`, prev/next, teclado, prévia grátis. *(I-1, I-2)*
3. Deixar o free-preview passar pela trava (ou parar de listar prévia de posição
   ≥ 2). *(I-2)*
4. Inverter o default de `completed_at` ausente: sem data → **destrava**, não
   tranca. *(I-3)*
5. Guardar o caso `allLessons.length !== 7`. *(I-4)*
6. Validar a data dentro da lib (`Number.isNaN(getTime())` → ignora a conclusão)
   em vez de confiar no guard de cada chamador. *(I-5)*
7. Adicionar `LessonPage.seteManhas.test.tsx` (arquivo novo, sem tocar no
   quebrado) cobrindo: redireciona bloqueada, **não** redireciona liberada,
   ignora outros produtos. *(I-6)*

**Não bloqueantes:** M-1 e M-2 juntos (o estado bloqueado precisa existir para
leitor de tela e para olho humano) valem subir junto com o C-1, porque são o
mesmo buraco de comunicação.
