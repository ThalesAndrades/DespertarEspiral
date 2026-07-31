# Fase 0 da Esteira — Bússola, Sete Manhãs, Bump e Home

**Data:** 2026-07-31
**Projeto:** despertarespiral.com (Vite + React + Tailwind + shadcn + Supabase)
**Origem:** `ESTEIRA-DIGITAL-10-PRODUTOS-v2.pdf`, Fase 0 (semanas 1–3)

---

## 1. Objetivo

Colocar em pé o primeiro degrau da esteira: uma porta de entrada gratuita que
**segmenta** a visitante, um produto de R$ 47 que **prova o método**, e um bump de
R$ 27 que **entrega conteúdo real** no checkout. A home passa a existir para levar
a esse caminho — e só a ele.

Critério de sucesso: uma visitante anônima consegue, sem ajuda, descobrir seu
arquétipo, receber a devolutiva, comprar o Sete Manhãs por PIX e começar o dia 1 —
com a segmentação dela gravada e utilizável para e-mail.

---

## 2. Correções ao documento de esteira

O documento de esteira parte de três premissas que **não se confirmam no código**.
A spec assume as versões corrigidas.

| Premissa do documento | Realidade verificada em 31/07 |
|---|---|
| "campos `pain_primary` / `social_archetype` que já existem no CRM" | **Não existem.** Nenhuma ocorrência no repo, nas migrações ou nas edge functions. Precisam ser criados. |
| "bump de 1 clique no checkout" | **Não existe.** `CheckoutPage.tsx` não tem nenhuma noção de bump. |
| "validado na landing com 2.500+ mulheres e nota 4.9" | Número **não verificado**, e conflita com os "280+" exibidos no site hoje. Ver §7. |

Tabelas que realmente existem: `user_profiles`, `launch_waitlist`, `products`,
`orders`, `user_products`, `lessons`, `lesson_progress`, `community_*`.
Não há tabela de CRM dedicada — o `AdminCRMPage` compõe a visão a partir dessas.

---

## 3. Escopo

Quatro entregas, nesta ordem de dependência:

1. **Bússola da Espiral** (`/bussola`) — diagnóstico gratuito de 12 perguntas.
2. **Sete Manhãs** — produto de R$ 47 com trilha de 7 dias e streak.
3. **Bump de R$ 27** no checkout.
4. **Home nova** — porta única para a Bússola.

### 3.1 Bússola da Espiral

Fluxo: intro → 12 perguntas → captura de e-mail → resultado.

- Cada pergunta pontua para um dos **4 pilares**: Consciência, Reconexão, Ativação,
  Integração. O pilar com maior pontuação define o **arquétipo**.
- O e-mail é pedido **antes** do resultado (o resultado é a moeda de troca).
- O resultado entrega: nome do arquétipo, leitura curta, retrato em PDF e o áudio
  de devolutiva. CTA final: Sete Manhãs.

**Reuso:** o motor de experiência do `MapaDoPoder.tsx` (passo-a-passo imersivo,
scroll-snap, captura ao final) é a base. A Bússola **não** herda o portão de QR
code — ela é pública por definição.

**Consequência a evitar:** `MapaDoPoder.tsx` tem 1057 linhas. Copiá-lo produziria um
segundo arquivo de mil linhas. O motor (passos, navegação, progresso, transições)
sai para `src/components/quiz/` como componentes reutilizáveis, e **as duas páginas
passam a consumi-lo**. Sem isso, a Fase 0 nasce com dívida.

### 3.2 Sete Manhãs

Produto normal do catálogo (`products`), com `slug = sete-manhas` e preço 47.
7 aulas do tipo áudio + 7 páginas de journaling.

A diferença em relação a um curso comum é o **ritmo**: uma manhã por dia, com
streak. O streak é derivado de `lesson_progress` (datas de conclusão), não uma
tabela nova — pular um dia deixa a volta "fosca", retomar reacende. Nunca há
punição ou perda de acesso.

### 3.3 Bump de R$ 27

Uma caixa marcável no `CheckoutPage`, antes do botão de pagar: "Mapa dos
Sentimentos que Aprisionam — +R$ 27".

Ao marcar, o total muda e **dois** produtos são liberados no pagamento confirmado.
Isso implica que um pedido passa a poder conter mais de um produto — hoje `orders`
tem um `product_id` único. Ver §4.

### 3.4 Home nova

Uma única ação: ir para a Bússola. As três chamadas concorrentes de hoje
("Entrar na lista", "Começar pelo Mapa do Poder", "Reservar minha vaga") saem.

Constrói-se sobre o design system existente (`DESIGN_SYSTEM.md`): tokens, sem hex
solto, tipografia fluida, motion calmo, `prefers-reduced-motion` respeitado.

---

## 4. Modelo de dados

**Novas colunas em `user_profiles`** (segmentação):

| Coluna | Tipo | Uso |
|---|---|---|
| `social_archetype` | `text` | Arquétipo resultante da Bússola |
| `pain_primary` | `text` | Pilar travado (Consciência/Reconexão/Ativação/Integração) |
| `archetype_at` | `timestamptz` | Quando foi diagnosticado (permite re-fazer e comparar) |

**Nova tabela `quiz_responses`** — as respostas cruas, separadas do resultado:

Guardar só o arquétipo final perde a informação que permite recalibrar o quiz
depois. Uma linha por conclusão, com as 12 respostas em `jsonb`, e-mail, e o
resultado calculado.

**`orders` com mais de um item:** a forma menos destrutiva é uma tabela
`order_items` (order_id, product_id, unit_price), mantendo `orders.product_id`
preenchido com o produto principal para não quebrar o que já lê essa coluna —
incluindo `asaas-webhook` e `grant-pending-access`. A liberação de acesso passa a
percorrer `order_items` quando existirem.

**RLS:** toda tabela nova nasce com RLS habilitada, no padrão de
`20260414_000001_production_rls.sql`. `quiz_responses` aceita INSERT anônimo
(a visitante não tem conta ainda) e SELECT apenas para admin.

---

## 5. Dependências de conteúdo

Nenhuma entrega vai ao ar sem estes itens, que **não são código** e dependem da
Sunyan:

- 12 perguntas da Bússola, com o peso de cada resposta nos 4 pilares
- Nome, leitura e retrato (PDF) de cada arquétipo
- Áudio de devolutiva (~8 min)
- 7 áudios-ritual do Sete Manhãs + 7 páginas de journaling
- O módulo real vendido como bump (vídeo + áudio)

**Recomendação:** o código é construído com conteúdo de exemplo claramente marcado
como provisório, e há um gate explícito antes de publicar — nenhum produto vai
para `is_active = true` com conteúdo de exemplo dentro.

---

## 6. Erros e casos de borda

- **Abandono no meio do quiz:** as respostas ficam em `sessionStorage`; ao voltar,
  a visitante retoma de onde parou. Nada é gravado no banco antes do e-mail.
- **E-mail repetido:** refazer a Bússola atualiza o arquétipo e grava uma nova
  linha em `quiz_responses`. O histórico é preservado.
- **Empate entre pilares:** desempate por ordem fixa (Consciência → Reconexão →
  Ativação → Integração), determinístico, nunca aleatório.
- **Pagamento não confirmado:** o comportamento atual (`order-recovery`,
  `grant-pending-access`) é preservado; o bump não introduz caminho novo de
  liberação.
- **Falha ao gravar segmentação:** não bloqueia o resultado. A visitante vê seu
  arquétipo; a falha é registrada para reprocessamento.

---

## 7. Prova social — pendência de veracidade

A home hoje exibe "280+ alunas" e "4.9 de avaliação"; o documento de esteira fala
em "2.500+ mulheres". Os dois números não podem ser verdade ao mesmo tempo.

A home nova **não** exibirá número de alunas ou nota até que o valor seja
confirmado contra os dados reais de `orders` / `user_products`. Se o número real
for pequeno, a página se sustenta em promessa e método, não em volume. Prova social
inventada em página de venda é risco jurídico (CDC) antes de ser risco de imagem.

---

## 8. Testes

O projeto já usa **vitest** com suíte de `CheckoutPage`. As entregas seguem o mesmo
padrão:

- **Pontuação da Bússola** — dado um conjunto de respostas, o arquétipo é o
  esperado; empates seguem a ordem de desempate; toda combinação produz exatamente
  um resultado.
- **Streak do Sete Manhãs** — dias consecutivos acendem; um dia pulado embaça sem
  remover acesso; retomar reacende.
- **Bump** — total com e sem bump; pedido com dois itens libera dois produtos;
  pedido sem bump continua liberando um (proteção contra regressão).
- **Home** — a página tem exatamente um CTA primário.

---

## 9. Fora de escopo

Não entram nesta spec, apesar de citados na esteira: Prosperidade em Espiral,
Método Completo (R$ 497), Círculo ao vivo, Clube Guardiã, Espelho (IA no WhatsApp),
Mentoria 1:1, Formação Guardiãs, e as 5 ferramentas de engajamento (Termômetro,
Jardim, Sussurros, SOS, Carta do Dia).

Também fora: a troca de gateway Asaas → Woovi. É uma decisão independente e, se for
feita, deve ser feita **antes** do bump — para não construir a lógica de dois itens
duas vezes.
