# Arquitetura - Despertar Espiral

## Visão atual (pós-Hostinger, OnSpace mantido)

```
+---------------------------+        +-----------------------------------+
|  Navegador (PT-BR)        |        |  OnSpace AI (Supabase)           |
|                           |        |                                   |
|  React 18 + Vite + TS     |  --->  |  - Auth Google OAuth             |
|  shadcn/ui + Tailwind     |        |  - Auth Email OTP                |
|  framer-motion            |  --->  |  - Postgres + RLS                |
|  zustand + react-query    |        |  - Storage (avatares, certs)     |
|                           |  --->  |  - Edge Functions (Deno)         |
|  HOST: Hostinger          |        |    asaas-webhook, certificate,    |
|  (dist/ via .htaccess)    |        |    reconcile, sequenzy-event,...  |
+---------------------------+        +-----------------------------------+
            |                                       |
            v                                       v
+---------------------------+        +-----------------------------------+
|  Cloudflare (opcional)    |        |  Asaas (PIX/cartão/boleto)        |
|  - DNS                    |        |  - Webhook -> OnSpace             |
|  - WAF / Rate limit       |        |  - Reconciliação noturna          |
|  - Brotli na borda        |        +-----------------------------------+
+---------------------------+
            |
            v
     Hostinger (origin)
     Apache/LiteSpeed + .htaccess
```

### Decisões-chave

1. **Frontend 100% estático** após `vite build` - cabe em qualquer hosting compartilhado. Hostinger sustenta isso sem servidor Node/Deno.
2. **OnSpace mantido como backend único** - tudo (`auth`, `from(...)`, `storage`, `functions.invoke`) continua usando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Nenhuma refatoração de código necessária.
3. **CI/CD por GitHub Actions** - PR roda lint/typecheck/test; push em `main` faz build + upload FTPS + smoke HTTP.
4. **Segurança em camadas** - CSP/HSTS no `.htaccess`, headers no `index.html`, RLS do Supabase, validate webhook signature nas edge functions.
5. **Sem CDN obrigatório** - Hostinger entrega gzip/brotli; Cloudflare é *opcional* e gratuito quando quiser bandwidth ilimitado + WAF.

## Caminho futuro (não no escopo atual)

Quando fizer sentido sair do OnSpace:

- **Etapa A**: provisionar Supabase próprio só para dados (auth segue no OnSpace) - dois clientes em `src/lib/supabase.ts`, sincronização por edge function `sync-user-from-onspace`.
- **Etapa B**: migrar auth (mais delicado) - exige reaproveitar identidades, tokens válidos e reconfigurar OAuth no Google Cloud Console.
- **Etapa C**: substituir Sequenzy por `n8n` self-host se quiser CRM aberto.

Esse caminho está documentado em alto nível em `docs/DEPLOY_HOSTINGER.md` e nas issues correlatas.

## Custos previstos

| Item | Custo mensal |
|---|---|
| Hostinger (plano Premium ou superior) | conforme contrato do usuário |
| OnSpace AI | conforme plano atual |
| Asaas | taxa por transação (sem mensalidade) |
| Cloudflare (opcional, DNS+WAF) | R$ 0 |
| GitHub Actions | R$ 0 até 2.000 min/mês em repo privado |

Nenhuma das mudanças deste PR aumenta custos recorrentes.
