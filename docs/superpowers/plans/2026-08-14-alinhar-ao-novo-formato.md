# Alinhar o código ao novo formato — mapa e ordem de execução

Varredura de 14/08/2026. **Novo formato:** sai Asaas → entram **Woovi (PIX)** e **Stripe (cartão)**; sai Sequenzy → entra **Resend**; backend passa a ser **Supabase self-hosted** (`/opt/despertar-supabase` no `thm-kvm4`).

## Tamanho medido

| Termo | Ocorrências | Arquivos |
|---|---|---|
| `asaas` (case-insensitive) | 132 | 16 |
| `sequenzy` (case-insensitive) | 267 | 41 |

Nenhum pacote npm a desinstalar — os dois fornecedores são consumidos via `fetch()` cru nas edge functions.

## 🚨 A armadilha, confirmada por leitura

**`supabase/functions/sequenzy-webhook/index.ts` não é webhook do Sequenzy.** É um endpoint de admin, guardado por JWT + `role === "admin"`, que expõe quatro ações:

| Ação | Linhas | Quem chama |
|---|---|---|
| `confirm_payment` | 98-241 | `src/pages/admin/AdminOrdersPage.tsx:116-120` — **único caminho de confirmação manual de pagamento** |
| `revoke_access` | 244-279 | mesma página |
| `add_subscriber` | 284-303 | ninguém (só Sequenzy) |
| `trigger_event` | 308-319 | ninguém (só Sequenzy) |

Apagar o arquivo junto com o Sequenzy deixa todo pedido pago fora do fluxo automático preso em `pending`, sem forma de liberar acesso. **Extrair as duas primeiras ações antes de qualquer remoção.**

## Veredito por edge function

| Função | Destino | Motivo |
|---|---|---|
| `ads-stats`, `social-stats`, `trello-boards` | **fica** | zero relação com pagamento/e-mail |
| `_shared/orderItems.ts`, `cors.ts`, `rateLimit.ts` | **fica** | infra agnóstica |
| `asaas-webhook` | **sai** | 284 linhas exclusivas do Asaas → vira webhook da Woovi + webhook do Stripe |
| `_shared/sequenzy.ts` | **sai** | client HTTP do Sequenzy (191 linhas) → `_shared/resend.ts` |
| `checkout-session` | **reescreve parcial** | núcleo (validação, trava do bump, `orders`/`order_items`) é agnóstico e fica; sai a perna de cobrança (`asaasRequest`/`upsertAsaasCustomer`/`createAsaasPayment`) e o bloco de automação |
| `sequenzy-webhook` | **reescreve e renomeia** | `confirm_payment`/`revoke_access` ficam; nome deveria ser algo como `admin-orders` |
| `grant-pending-access` | **reescreve parcial** | núcleo fica; bloco Sequenzy vira Resend |
| `order-recovery` | **reescreve parcial** | detecção fica; ⚠️ o filtro `.not("asaas_payment_id","is",null)` precisa de equivalente |
| `send-email` | **reescreve** | allowlist e regra de auth ficam; a chamada troca para Resend |
| `sequenzy-event` | **decidir** | proxy genérico de evento usado por 7+ páginas via `src/lib/sequenzy.ts`; renomeia se a camada de automação continuar, sai se não |
| `crm-stats` | **encolhe** | bloco "platform" fica; bloco "automation" é 100% API do Sequenzy e não tem equivalente no Resend |

## Ordem obrigatória (o que quebra se inverter)

1. **Extrair `confirm_payment`/`revoke_access` ANTES** de mexer no `sequenzy-webhook`.
2. **Só remover `asaas_payment_id` depois** que Woovi/Stripe escreverem em coluna equivalente — senão `order-recovery` para de achar pedido atrasado **em silêncio**, sem erro.
3. **Só trocar `SEQUENZY_API_KEY` depois** de reescrever `_shared/sequenzy.ts` e `send-email` — o disparo é fire-and-forget e falha calado; o pior caso é o e-mail "acesso-liberado" parar de sair: cliente paga, não recebe nada, e ninguém fica sabendo.
4. **Tirar "boleto" do seletor** (`CheckoutPage.tsx:31-35`) na mesma leva em que o backend passar a falar só com Woovi/Stripe. **Boleto não tem provedor no novo formato** — é decisão de produto pendente.
5. **Atualizar `CheckoutPage.tsx:205-233` junto** com a resposta do backend: hoje lê `invoiceUrl`/`pixQrCode`/`pixKey`/`barCode`, formato moldado pelo Asaas. Woovi devolve `brCode`/`qrCodeImage`/`correlationID`; Stripe devolve `client_secret`/URL de checkout.

## Banco

| Coluna | Situação |
|---|---|
| `orders.asaas_payment_id` | **viva** — escrita por `checkout-session`, lida por `asaas-webhook`, filtrada por `order-recovery`. Renomear para nome neutro (`provider_charge_id`, padrão que o app PHP irmão já adotou) exige backfill. |
| `orders.sequenzy_session_id` | ~~morta~~ — **removida em 14/08**: nunca era escrita. |
| `orders.sequenzy_payment_id` | ~~morta~~ — **removida em 14/08**: zero referência em código. |

## Estágio 1 — feito em 14/08 (limpeza sem risco)

- Removidas as duas colunas mortas do `20260413_000000_schema_base.sql`.
- Removido o campo morto `sequenzy_session_id` do type em `AdminOrdersPage.tsx`.
- `_shared/cors.ts`: o header `x-sequenzy-signature` (declarado e nunca verificado) deu lugar a `x-webhook-signature` (Woovi) e `stripe-signature`.

## Estágios seguintes — bloqueados

- **Estágio 2** (extrair `confirm_payment`/`revoke_access` para função de nome neutro) — pronto para executar.
- **Estágio 3** (Woovi + Stripe) — **bloqueado**: não existe chave Stripe em lugar nenhum da frota; a da Woovi foi herdada do QVCF e autentica.
- **Estágio 4** (Resend) — depende de `RESEND_API_KEY`; o slot já existe no stack.
- **Decisão de produto pendente:** o que fazer com o boleto.
