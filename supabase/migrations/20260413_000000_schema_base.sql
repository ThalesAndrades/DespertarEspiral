-- Schema base do Despertar Espiral, reconstruido a partir do OpenAPI do PostgREST
-- do backend OnSpace (unica fonte acessivel: la nao ha credencial de admin).
-- Traz colunas, tipos, defaults, NOT NULL, PK e FK. NAO traz indices, checks,
-- triggers, funcoes nem RLS — a RLS vem das migracoes do repo, aplicadas depois.
-- As FKs ficam no fim, em alter table, para nao depender da ordem de criacao.

create table if not exists public.quiz_attempts (
  id uuid default gen_random_uuid() not null,
  quiz_id uuid not null,
  user_id uuid not null,
  score integer not null,
  passed boolean not null,
  answers jsonb not null,
  completed_at timestamp with time zone default now(),
  primary key (id)
);

create table if not exists public.orders (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  product_id uuid not null,
  email text not null,
  name text,
  amount numeric not null,
  status text default 'pending' not null,
  payment_method text,
  sequenzy_session_id text,
  sequenzy_payment_id text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  asaas_payment_id text,
  recovery_sent_at timestamp with time zone,
  primary key (id)
);

create table if not exists public.community_comments (
  id uuid default gen_random_uuid() not null,
  post_id uuid not null,
  user_id uuid not null,
  body text not null,
  is_visible boolean default true,
  created_at timestamp with time zone default now(),
  primary key (id)
);

create table if not exists public.lesson_progress (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  lesson_id uuid not null,
  completed boolean default false,
  completed_at timestamp with time zone,
  primary key (id)
);

create table if not exists public.module_quizzes (
  id uuid default gen_random_uuid() not null,
  module_id uuid not null,
  title text default 'Quiz do módulo' not null,
  description text,
  passing_score integer default 70 not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default now(),
  primary key (id)
);

create table if not exists public.quiz_options (
  id uuid default gen_random_uuid() not null,
  question_id uuid not null,
  text text not null,
  is_correct boolean default false not null,
  sort_order integer default 0 not null,
  primary key (id)
);

create table if not exists public.lessons (
  id uuid default gen_random_uuid() not null,
  module_id uuid not null,
  title text not null,
  type text not null,
  content text,
  duration_min integer default 0,
  sort_order integer default 0,
  is_free boolean default false,
  created_at timestamp with time zone default now(),
  primary key (id)
);

create table if not exists public.products (
  id uuid default gen_random_uuid() not null,
  slug text not null,
  title text not null,
  subtitle text,
  description text,
  price numeric default 0 not null,
  original_price numeric,
  is_active boolean default true,
  thumbnail_url text,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  certificate_config jsonb,
  primary key (id)
);

create table if not exists public.community_posts (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  category text not null,
  title text not null,
  body text not null,
  is_pinned boolean default false,
  is_visible boolean default true,
  likes_count integer default 0,
  comments_count integer default 0,
  created_at timestamp with time zone default now(),
  primary key (id)
);

create table if not exists public.user_profiles (
  id uuid not null,
  username text,
  email text not null,
  role text default 'member' not null,
  anonymous_name text,
  full_name text,
  primary key (id)
);

create table if not exists public.user_products (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  product_id uuid not null,
  granted_at timestamp with time zone default now(),
  primary key (id)
);

create table if not exists public.modules (
  id uuid default gen_random_uuid() not null,
  product_id uuid not null,
  title text not null,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  primary key (id)
);

create table if not exists public.quiz_questions (
  id uuid default gen_random_uuid() not null,
  quiz_id uuid not null,
  question text not null,
  type text default 'multiple_choice' not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now(),
  primary key (id)
);

create table if not exists public.launch_waitlist (
  id uuid default gen_random_uuid() not null,
  name text not null,
  email text not null,
  phone text,
  source text default 'landing',
  created_at timestamp with time zone default now(),
  primary key (id)
);

create table if not exists public.community_likes (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  post_id uuid,
  comment_id uuid,
  created_at timestamp with time zone default now(),
  primary key (id)
);

-- Chaves estrangeiras (idempotentes)
do $$ begin alter table public.quiz_attempts add constraint fk_quiz_attempts_quiz_id foreign key (quiz_id) references public.module_quizzes(id) on delete cascade; exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin alter table public.quiz_attempts add constraint fk_quiz_attempts_user_id foreign key (user_id) references public.user_profiles(id) on delete cascade; exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin alter table public.orders add constraint fk_orders_user_id foreign key (user_id) references public.user_profiles(id) on delete cascade; exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin alter table public.orders add constraint fk_orders_product_id foreign key (product_id) references public.products(id) on delete cascade; exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin alter table public.community_comments add constraint fk_community_comments_post_id foreign key (post_id) references public.community_posts(id) on delete cascade; exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin alter table public.community_comments add constraint fk_community_comments_user_id foreign key (user_id) references public.user_profiles(id) on delete cascade; exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin alter table public.lesson_progress add constraint fk_lesson_progress_user_id foreign key (user_id) references public.user_profiles(id) on delete cascade; exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin alter table public.lesson_progress add constraint fk_lesson_progress_lesson_id foreign key (lesson_id) references public.lessons(id) on delete cascade; exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin alter table public.module_quizzes add constraint fk_module_quizzes_module_id foreign key (module_id) references public.modules(id) on delete cascade; exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin alter table public.quiz_options add constraint fk_quiz_options_question_id foreign key (question_id) references public.quiz_questions(id) on delete cascade; exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin alter table public.lessons add constraint fk_lessons_module_id foreign key (module_id) references public.modules(id) on delete cascade; exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin alter table public.community_posts add constraint fk_community_posts_user_id foreign key (user_id) references public.user_profiles(id) on delete cascade; exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin alter table public.user_products add constraint fk_user_products_user_id foreign key (user_id) references public.user_profiles(id) on delete cascade; exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin alter table public.user_products add constraint fk_user_products_product_id foreign key (product_id) references public.products(id) on delete cascade; exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin alter table public.modules add constraint fk_modules_product_id foreign key (product_id) references public.products(id) on delete cascade; exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin alter table public.quiz_questions add constraint fk_quiz_questions_quiz_id foreign key (quiz_id) references public.module_quizzes(id) on delete cascade; exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin alter table public.community_likes add constraint fk_community_likes_user_id foreign key (user_id) references public.user_profiles(id) on delete cascade; exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin alter table public.community_likes add constraint fk_community_likes_post_id foreign key (post_id) references public.community_posts(id) on delete cascade; exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin alter table public.community_likes add constraint fk_community_likes_comment_id foreign key (comment_id) references public.community_comments(id) on delete cascade; exception when duplicate_object then null; when duplicate_table then null; end $$;
