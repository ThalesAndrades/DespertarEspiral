# Backend do Despertar Espiral para VPS — plano de migração

Escrito em 14/08/2026. **Nada aqui foi executado.** Cada fase que toca produção precisa de OK explícito seu, no momento.

Passou pelo âncora de infra (`THM-Tecnologia/docs/superpowers/specs/2026-08-01-00-visao-geral-e-plano.md`, resumo em `INICIO.md §3`). As decisões que mordem estão na seção "O que o âncora obriga".

---

## Estado medido em 14/08 — três camadas desconectadas

| Camada | O que é hoje |
|---|---|
| **Site no ar** (`despertarespiral.com`) | Build que roda com **banco falso no navegador** (`de_local_db_v1` no localStorage). Zero chamada de backend. `/login` volta para `/`. **Não saiu deste repo** — a string não existe em nenhum commit. |
| **Backend real** | **OnSpace** (`ejbdpbkyirqmlgtiejbd.backend.onspace.ai`), vivo, com o schema deste projeto (15 tabelas). `products` mostra 1 linha ao anon. **`order_items` dá 404** → migração do bump não aplicada. |
| **VPS** | **Não tem nada deste projeto.** Varredura por `launch_waitlist` em todo container com psql do `thm-kvm4` e do `223`: zero. Método validado (acha as tabelas do QVCF). |

O objetivo deste plano é fundir as três em uma: backend próprio em VPS, com o site no ar realmente conversando com ele.

---

## Host escolhido: `thm-kvm4` (187.127.34.34)

Medido em 14/08, serializado:

| Host | RAM usada | Disco | Containers | Load | Veredito |
|---|---|---|---|---|---|
| **thm-kvm4** | 13/31 GiB | 85G/387G (22%) | 68 | 1.85 | **Escolhido** |
| thm-rooom | 10/31 GiB | 45G/387G (12%) | 26 | 0.13 | Rejeitado — ver abaixo |
| 223 (thm-vps) | 2/7 GiB | 34G/96G (36%) | 22 | 0.42 | Rejeitado — só ~5 GiB livres e hospeda receita (Mailu, simulados) |
| thm-ci | 0/3 GiB | 11G/48G | 8 | 0.00 | Rejeitado — **3 GiB no total** não comporta o stack |

**Por que o kvm4:** o precedente já está lá. `/opt/qvcf-supabase` roda um Supabase self-hosted com **11 serviços** (`studio kong auth rest storage imgproxy meta functions db db-config deno-cache`) consumindo **~1,8 GiB**. Copiar um padrão que já funciona nesta frota vale mais que ganhar RAM ociosa em outra máquina. 1,8 GiB cabe folgado nos ~18 GiB livres, e o Traefik/roteamento já existe.

**Por que NÃO o thm-rooom, apesar de ser o melhor no papel:** medido agora, `ufw` está **inactive** e o `iptables` tem `-P INPUT ACCEPT` — a máquina está aberta. Colocar o banco de um checkout ali antes de fechar isso seria trocar um problema por outro. O endurecimento do rooom é trabalho legítimo, mas **separado**; este projeto não deve depender dele.

⚠️ Contrapartida honesta do kvm4: é a máquina mais carregada e a de maior raio de estrago — já são 5 projetos nela. O stack novo é modesto, mas o argumento existe e é seu para pesar.

---

## O que o âncora obriga

- **D1/D2/D3 — segredos.** O stack novo cria segredos novos: senha do Postgres, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, além dos que já existem (Asaas, Resend). O destino correto é o cofre **SOPS+age** no `thm-cofre`. **Mas o SP2 (cofre) está ❌ não implementado.** Enquanto não estiver: os segredos ficam **só** no `.env` do servidor, com permissão restrita, **nunca** em arquivo versionado, log ou output — e entram na fila de rotação de D3 quando o cofre subir. Isto é dívida declarada, não descuido.
- **D9 — `INFRA.md` é gerado.** Ao final, regenerar. E lembrar da armadilha já documentada: para o inventário enxergar um serviço novo, são **quatro** lugares a tocar, não um.
- **D5 — o hub é bancada, não bastion.** Este plano não muda papel de rede de ninguém: só sobe um stack de aplicação.

---

## Bloqueadores — resolver ANTES da fase 1

Nenhum deles é código; todos dependem de você.

1. **Credenciais do OnSpace.** Aqui só existe a `anon key`. Sem a `service_role` (ou a string de conexão Postgres) **não há como exportar os dados** nem sequer contar quantos são: as tabelas voltam 0 ao anon por RLS, o que não prova banco vazio. Pegue no painel do OnSpace.
2. **Domínio do backend.** Definir (ex.: `api.despertarespiral.com`) e ter o DNS na mão. O Kong/Traefik precisa de um hostname com TLS.
3. **Painel do Asaas.** A URL do webhook aponta hoje para o backend antigo. Trocar de backend **sem** atualizar isso faz pagamento confirmado nunca chegar. É o risco número um deste plano.

---

## Fases

Cada fase termina num ponto verificável. Fases 1 em diante só começam com seu OK.

### F0 — Inventário do dado (só leitura, precisa da `service_role`)
Contar linhas de cada tabela, listar buckets do Storage, listar as edge functions publicadas e quais segredos elas usam. **Sem este retrato não dá para saber se a migração é "criar do zero" ou "mover dado real"** — e as duas coisas têm tamanhos muito diferentes.

### F1 — Subir o stack no `thm-kvm4`
Copiar o padrão de `/opt/qvcf-supabase` para `/opt/despertar-supabase`: mesmos 11 serviços, portas próprias, senhas e `JWT_SECRET` **novos** (nunca reaproveitar os do QVCF), volume próprio, e o hostname atrás do Traefik com TLS. Critério de pronto: `GET /rest/v1/` responde 200 com a `anon key` nova.

### F2 — Schema
Aplicar, na ordem, as migrações do repo: `20260414_000001_production_rls`, `20260731_000001_storefront`, `20260731_000002_seed_esteira`, `20260801_000001_bussola`, `20260814_000001_order_items`. Critério: as quatro verificações do runbook do bump passam (`to_regclass`, RLS, índices, policy).

### F3 — Dados
Se F0 mostrar acesso Postgres: `pg_dump`/`restore` das tabelas de aplicação. Se só houver PostgREST: exportar tabela a tabela com a `service_role` e reimportar. **`auth.users` é o caso delicado** — migra hash de senha; se não vier, todo mundo precisa redefinir senha.

### F4 — Edge functions
Deploy de **todas** as que o app usa, não só as quatro do bump: `checkout-session`, `asaas-webhook`, `grant-pending-access`, `sequenzy-webhook`, `send-email`, `order-recovery`, `crm-stats`, `ads-stats`, `social-stats`, `trello-boards`. Com os segredos configurados no servidor.

### F5 — Front
Rebuildar **este repo** com as `VITE_*` novas e publicar. É aqui que o site deixa de ser demonstração. Critério: `Object.keys(localStorage)` no site mostra uma chave `sb-*-auth-token` e **não** mostra `de_local_db_v1`.

### F6 — Corte e verificação
Atualizar o webhook no painel do Asaas e os redirect URIs do Google OAuth. Compra de ponta a ponta em valor mínimo, conferindo: pedido criado, webhook recebido, `user_products` liberado. Só depois considerar o corte concluído.

### F7 — Backup e inventário
Cron de dump diário com verificação de restauração (o padrão do backup do Garage no SC Mais serve de modelo), e regenerar o `INFRA.md` (D9, quatro lugares).

---

## Riscos que não são óbvios

- **Trocar o `JWT_SECRET` invalida todas as sessões.** Quem estiver logado cai. Aceitável, mas é comunicação a fazer, não surpresa.
- **Google OAuth** tem os redirect URIs presos ao domínio antigo do backend. Esquecer isso quebra o "entrar com Google" silenciosamente.
- **O site atual não é deste repo.** Publicar este repo é, na prática, **trocar o site inteiro** — não é um deploy incremental. Esperar diferenças visuais e de rota, e revisar a home antes (ela ainda tem os três CTAs concorrentes que a spec manda remover, e a prova social "280+ alunas / 4.9" que ninguém confirmou).
- **`CONTEUDO_PROVISORIO=true`** na Bússola continua valendo: publicar este repo leva junto o quiz com conteúdo que a Sunyan ainda não aprovou.
- **Custo.** O burn atual da frota já é ~R$894/mês com MRR R$ 0. Este plano não adiciona VPS, só containers num que já existe — mas adiciona superfície para manter.
