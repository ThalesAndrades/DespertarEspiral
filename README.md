# Despertar Espiral

Plataforma de cursos online (área de membros, painel administrativo, comunidade,
checkout e CRM) — **Mulher Espiral · Método de Reconexão e Cura**, por Sunyan Nunes.

## Tech stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** + design tokens (ver [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md))
- **shadcn/ui** (`src/components/ui`, read-only)
- **Supabase** — Postgres, Auth, Storage e Edge Functions (`supabase/`)
- **React Router**, **TanStack Query**, **react-helmet-async**, **sonner**

## Desenvolvimento local

Requer **Node.js 18+** (ou **Bun**).

```sh
# 1. Instalar dependências
npm install        # ou: bun install

# 2. Configurar variáveis de ambiente
cp .env.example .env
#   edite .env e preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
#   com os dados do seu projeto Supabase

# 3. Subir o servidor de desenvolvimento
npm run dev        # ou: bun run dev
```

Outros scripts: `npm run build` (produção), `npm run build:dev`, `npm run preview`, `npm run lint`.

## Variáveis de ambiente

| Variável | Onde | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | `.env` | Chave anônima (pública) do Supabase |

As Edge Functions (`supabase/functions/`) usam secrets configurados no painel do
Supabase (`SUPABASE_SERVICE_ROLE_KEY`, `SEQUENZY_API_KEY`, `ALLOWED_ORIGINS`,
`PUBLIC_SITE_URL`, etc.) — ver `.env.example`.

## Backend (Supabase)

O esquema, as políticas RLS, os buckets de storage e as Edge Functions vivem em
`supabase/`. Para apontar o app para um projeto Supabase próprio, basta criar o
projeto, aplicar o esquema, e preencher as variáveis acima — o código não tem
dependência de nenhuma plataforma específica de hospedagem.

## Deploy

Build estático (`npm run build` → `dist/`) servível por qualquer host estático
(Netlify, Vercel, Cloudflare Pages, etc.). As Edge Functions são publicadas via
Supabase CLI (`supabase functions deploy`).
