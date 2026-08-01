-- Bussola da Espiral: respostas cruas + segmentacao.
--
-- quiz_responses guarda CADA conclusao do quiz (email + 12 respostas + resultado),
-- inclusive de visitantes sem conta. Refazer o quiz gera nova linha (historico
-- preservado, spec §6). As respostas cruas permitem recalibrar o quiz depois.
--
-- user_profiles nao tem email (a chave e o auth uid); a ponte visitante->usuaria
-- e feita por trigger que consulta auth.users pelo email. SECURITY DEFINER
-- porque o papel anon nao enxerga auth.users nem pode escrever em perfis alheios.

-- Constraints abaixo mitigam flood/injecao de lixo via INSERT anonimo
-- (qualquer um com a anon key pode inserir); rate-limit de verdade fica
-- para a borda (pendencia).
create table if not exists public.quiz_responses (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 254),
  answers jsonb not null check (pg_column_size(answers) <= 8192),
  pain_primary text not null check (pain_primary in ('consciencia','reconexao','ativacao','integracao')),
  social_archetype text not null check (char_length(social_archetype) <= 60),
  content_version text not null default 'v1-provisorio',
  created_at timestamptz not null default now()
);

create index if not exists idx_quiz_responses_email
  on public.quiz_responses (lower(email), created_at desc);

alter table public.quiz_responses enable row level security;

-- Visitante anonima PODE inserir (e o unico jeito de o quiz publico gravar).
-- Ninguem le pela API publica: SELECT so para admin (policy abaixo, via
-- public.is_admin()) — sem ela, anon/authenticated comuns recebem 0 linhas.
drop policy if exists "quiz_responses_anon_insert" on public.quiz_responses;
create policy "quiz_responses_anon_insert" on public.quiz_responses
  for insert to anon, authenticated
  with check (true);

-- Leitura: so admin (via painel/app). A API publica nunca le respostas.
drop policy if exists "quiz_responses_admin_read" on public.quiz_responses;
create policy "quiz_responses_admin_read" on public.quiz_responses
  for select to authenticated
  using (public.is_admin());

-- Segmentacao no perfil (spec §4).
alter table public.user_profiles
  add column if not exists social_archetype text,
  add column if not exists pain_primary text,
  add column if not exists archetype_at timestamptz;

-- Backfill: ao gravar uma resposta, se existir usuaria com aquele email,
-- atualiza o perfil dela. Se nao existir, nada acontece — e quando ela criar
-- conta depois, o handle_new_user (se existir) NAO cobre isso; a associacao
-- retroativa fica para um plano futuro (ver Pendencias do plano).
create or replace function public.quiz_backfill_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  select u.id into uid
    from auth.users u
   where lower(u.email) = lower(new.email)
   limit 1;

  if uid is not null then
    update public.user_profiles
       set social_archetype = new.social_archetype,
           pain_primary     = new.pain_primary,
           archetype_at     = new.created_at
     where id = uid;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_quiz_backfill_profile on public.quiz_responses;
create trigger trg_quiz_backfill_profile
  after insert on public.quiz_responses
  for each row execute function public.quiz_backfill_profile();
