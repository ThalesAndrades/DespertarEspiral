create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

alter table public.user_profiles enable row level security;
alter table public.user_products enable row level security;
alter table public.orders enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.products enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;

create policy "profiles_select_own_or_admin"
on public.user_profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own"
on public.user_profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "user_products_select_own_or_admin"
on public.user_products
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "orders_select_own_or_admin"
on public.orders
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "products_select_active"
on public.products
for select
to authenticated
using (is_active = true or public.is_admin());

create policy "modules_select_active_products"
on public.modules
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.products p
    where p.id = modules.product_id
      and p.is_active = true
  )
);

create policy "lessons_select_free_or_entitled"
on public.lessons
for select
to authenticated
using (
  public.is_admin()
  or lessons.is_free = true
  or exists (
    select 1
    from public.modules m
    join public.user_products up on up.product_id = m.product_id
    where m.id = lessons.module_id
      and up.user_id = auth.uid()
  )
);

create policy "lesson_progress_select_own"
on public.lesson_progress
for select
to authenticated
using (user_id = auth.uid());

create policy "lesson_progress_upsert_own"
on public.lesson_progress
for insert
to authenticated
with check (user_id = auth.uid());

create policy "lesson_progress_update_own"
on public.lesson_progress
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

revoke update on table public.user_profiles from authenticated;
grant update (full_name, anonymous_name, username) on table public.user_profiles to authenticated;

revoke insert, update, delete on table public.products from authenticated;
revoke insert, update, delete on table public.modules from authenticated;
revoke insert, update, delete on table public.lessons from authenticated;
