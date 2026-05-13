# Deploy no Hostinger

Este guia descreve **o caminho completo** para subir o frontend do Despertar Espiral em hospedagem compartilhada do Hostinger, mantendo o backend (auth, banco, edge functions, storage) no OnSpace AI.

## Arquitetura resumida

```
Navegador  --->  https://despertarespiral.com  (Hostinger, dist/ estático via .htaccess)
                          |
                          v
           OnSpace AI (Supabase)
           - Auth Google + OTP email
           - Postgres + RLS
           - Storage (avatares, certificados)
           - Edge Functions (Asaas webhook, certificate, reconcile, ...)
```

O frontend é 100% estático após `vite build` - serve arquivos compilados em `dist/`.

## Pré-requisitos

- Plano Hostinger Premium ou superior (Web Hosting compartilhado está OK).
- Domínio `despertarespiral.com` já vinculado à conta Hostinger.
- Acesso ao repositório no GitHub com permissão para configurar Secrets.

## 1. Criar conta FTP dedicada ao deploy

No hPanel:
1. **Arquivos** -> **Contas FTP** -> **Criar nova conta FTP**.
2. Nome de usuário sugerido: `deploy@despertarespiral.com`.
3. Pasta inicial: `/public_html/`.
4. Senha: gerar 32+ caracteres aleatórios; guarde no gerenciador de senhas.
5. Anote também o **servidor FTP** mostrado (ex.: `ftp.despertarespiral.com` ou `files.000webhost.com`).

FTPS é ativado por padrão no Hostinger; porta 21 com TLS explícito.

## 2. Fornçar SSL

hPanel -> **Avançado** -> **SSL** -> **Instalar SSL gratuito (Let's Encrypt)** para `despertarespiral.com` e `www.despertarespiral.com`. Aguardar ~5 minutos. Ativar **Forçar HTTPS** (o `.htaccess` já redireciona, mas dupla proteção não atrapalha).

## 3. Configurar GitHub Secrets

No repositório `ThalesAndrades/DespertarEspiral`:

**Settings -> Secrets and variables -> Actions -> New repository secret**

| Nome | Valor |
|---|---|
| `HOSTINGER_FTP_SERVER` | servidor FTP (ex.: `ftp.despertarespiral.com`) |
| `HOSTINGER_FTP_USERNAME` | `deploy@despertarespiral.com` |
| `HOSTINGER_FTP_PASSWORD` | senha gerada na etapa 1 |
| `HOSTINGER_FTP_REMOTE_DIR` | `/public_html/` (ou subpasta, se for o caso) |
| `VITE_SUPABASE_URL` | URL do projeto OnSpace |
| `VITE_SUPABASE_ANON_KEY` | anon key do projeto OnSpace |

> O workflow `deploy-hostinger.yml` injeta os dois últimos no momento do `npm run build`. Eles são **embutidos no JS final** - não coloque a service-role key aqui.

## 4. Primeiro deploy

1. Mergear este PR para `main`.
2. O workflow **Deploy to Hostinger** roda automaticamente: build + upload + smoke test.
3. Acompanhar em **Actions** -> Deploy to Hostinger.

Deploy manual sob demanda: aba **Actions** -> escolher o workflow -> **Run workflow**.

## 5. Apontamento de DNS

Se o domínio já está no Hostinger, **não precisa mudar nada**. Se você quer Cloudflare na frente:

1. No Cloudflare: adicionar zona `despertarespiral.com`.
2. Atualizar nameservers no registrador para os do Cloudflare.
3. Apontar registros `A` e `CNAME` para o IP/host do Hostinger.
4. Manter **DNS only** (nuvem cinza) até o SSL Let's Encrypt validar; depois ativar **proxied** (nuvem laranja).

## 6. Smoke test após o primeiro deploy

Caminhos a validar manualmente:

- `/` carrega a Landing.
- `/products` lista produtos.
- `/login` autentica via Google OAuth (callback do OnSpace).
- `/register` envia OTP por email (OnSpace).
- Acessar uma rota inexistente como `/foo` -> deve cair em 404 do React (não do Apache).
- DevTools -> Network: nenhum recurso falhando em CSP. Se algo bloquear, ajustar `Content-Security-Policy` em `public/.htaccess`.
- Lighthouse: LCP deve ficar < 2.5s em 4G.

## 7. Rollback

Deploy é idempotente. Para reverter:

1. **Actions** -> Deploy to Hostinger -> Run workflow em uma commit anterior.
2. Ou, em emergência, baixar a versão anterior do `dist/` (artifact do workflow se habilitado) e subir manualmente via FileManager do hPanel.

O `.htaccess` redireciona 404 para `/index.html`, então um deploy parcial **não quebra rotas existentes** enquanto outras chegam.

## Troubleshooting

| Sintoma | Causa provável | Ação |
|---|---|---|
| 403 em `/` | `.htaccess` não foi enviado | Confirmar `dist/.htaccess` no log do workflow |
| Rotas SPA dão 404 | mod_rewrite desativado no plano | Hostinger Premium+ tem por padrão; abrir ticket |
| Erros CSP em produção | domínio externo não listado | Adicionar em `public/.htaccess` -> bloco `connect-src`/`frame-src` |
| Login Google falha em prod | Origem/Redirect URI não autorizada | Adicionar `https://despertarespiral.com` no Console Google + OnSpace |
| OTP por email não chega | Configuração no OnSpace | Verificar Templates de email + SPF/DKIM do domínio enviante |
