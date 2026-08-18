-- Colunas neutras de gateway de pagamento em orders.
-- Preparam a troca do Asaas por Woovi (PIX) e Stripe (cartao), sem quebrar
-- quem ja le asaas_payment_id (asaas-webhook, order-recovery). A coluna
-- antiga NAO sai aqui — so depois que o substituto estiver gravando nela.
-- Ver docs/superpowers/plans/2026-08-14-alinhar-ao-novo-formato.md, regra 2
-- da "Ordem obrigatoria".

alter table public.orders
  add column if not exists provider text,
  add column if not exists provider_charge_id text,
  add column if not exists provider_payment_url text;

-- E por provider_charge_id que o webhook do gateway (Woovi/Stripe) acha
-- o pedido — mesmo papel que asaas_payment_id tem hoje pro asaas-webhook.
create index if not exists idx_orders_provider_charge_id
  on public.orders (provider_charge_id);
