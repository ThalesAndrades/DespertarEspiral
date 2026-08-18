-- Vitrine: campos de apresentacao e disponibilidade do produto.
-- status nasce 'em_breve' de proposito: produto criado no admin nao pode
-- ficar compravel por acidente antes de ter conteudo dentro.

alter table public.products
  add column if not exists status text not null default 'em_breve',
  add column if not exists promise text,
  add column if not exists highlights jsonb not null default '[]'::jsonb,
  add column if not exists sort_order int not null default 100;

alter table public.products
  drop constraint if exists products_status_check;
alter table public.products
  add constraint products_status_check
  check (status in ('disponivel', 'em_breve'));

-- O unico produto que ja vendia continua vendendo.
-- Ancorado por slug (nao por is_active/status) para que reaplicar esta
-- migracao depois do seed 000002 nao promova em massa os produtos em_breve
-- que tambem nascem com is_active = true.
update public.products
   set status = 'disponivel'
 where slug = 'mulher-espiral'
   and status = 'em_breve';

create index if not exists idx_products_storefront
  on public.products (status, sort_order);

-- Lista de espera passa a saber DE QUAL produto.
-- Nullable: as linhas antigas (captura do MapaDoPoder) continuam validas.
alter table public.launch_waitlist
  add column if not exists product_id uuid references public.products(id) on delete set null;

create unique index if not exists uniq_waitlist_email_product
  on public.launch_waitlist (lower(email), product_id)
  where product_id is not null;

-- A vitrine da home e publica: visitante anonimo precisa LER products.
-- Sem esta politica, anon recebe 0 linhas sem erro e a vitrine fica vazia.
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select to anon
  using (is_active = true);
