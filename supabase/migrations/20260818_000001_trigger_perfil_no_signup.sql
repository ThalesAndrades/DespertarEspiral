-- Recria o trigger que o OnSpace tinha e o replay via OpenAPI PERDEU
-- (OpenAPI nao expoe triggers): todo signup em auth.users ganha a linha
-- correspondente em public.user_profiles. Sem isso, o webhook de pagamento
-- nao encontra a compradora por e-mail e o acesso pos-cadastro nunca chega.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, full_name, anonymous_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'anonymous_name', 'Convidada')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: usuarios que ja nasceram sem perfil
insert into public.user_profiles (id, email, full_name, anonymous_name)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', ''), 'Convidada'
from auth.users u
left join public.user_profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
