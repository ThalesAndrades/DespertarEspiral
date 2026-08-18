-- Um pedido pode conter mais de um produto (bump de R$ 27).
-- orders.product_id CONTINUA sendo o produto principal: tudo que ja le essa
-- coluna (asaas-webhook, grant-pending-access, order-recovery) segue valido.
-- order_items e aditivo — pedido antigo, sem itens, tem fallback no codigo.

create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id)   on delete cascade,
  product_id  uuid not null references public.products(id) on delete restrict,
  unit_price  numeric(10,2) not null check (unit_price >= 0),
  created_at  timestamptz not null default now()
);

-- Idempotencia do gravador: reprocessar um pedido nao duplica item.
create unique index if not exists uniq_order_items_order_product
  on public.order_items (order_id, product_id);

-- A liberacao de acesso percorre os itens de UM pedido: este e o caminho quente.
create index if not exists idx_order_items_order
  on public.order_items (order_id);

alter table public.order_items enable row level security;

-- Mesma regra de orders: a aluna ve os itens do proprio pedido; admin ve tudo.
-- Escrita e exclusiva do service_role (edge functions), que ignora RLS —
-- por isso NAO existe policy de insert/update/delete aqui, de proposito.
drop policy if exists "order_items_select_own_or_admin" on public.order_items;
create policy "order_items_select_own_or_admin"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
     where o.id = order_items.order_id
       and (o.user_id = auth.uid() or public.is_admin())
  )
);
