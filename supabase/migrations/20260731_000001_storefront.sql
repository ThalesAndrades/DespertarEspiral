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
update public.products
   set status = 'disponivel'
 where is_active = true
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
