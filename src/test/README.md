/**
 * README — Testes unitários & integração
 *
 * Stack: Vitest + @testing-library/react + @testing-library/user-event + jsdom
 *
 * Comandos:
 *   npx vitest                  → watch mode (re-executa ao salvar)
 *   npx vitest run              → single run (CI)
 *   npx vitest run --coverage   → coverage report (lcov + html em coverage/)
 *
 * ─────────────────────────────────────────────────────────────
 * TESTES UNITÁRIOS (lib + hooks + ui + types)
 * ─────────────────────────────────────────────────────────────
 *
 * src/lib/__tests__/
 *   authErrors.test.ts    → mapAuthError: 30+ casos pt-BR, fallback, edge cases
 *   contentSafety.test.ts → sanitizeHtml, safeExternalUrl, safeEmbedUrl
 *   analytics.test.ts     → captureAttribution, getAttribution (UTM params)
 *   dateUtils.test.ts     → timeAgo, greeting, formatBRL, progressPct, clamp, truncate, capitalize, initials
 *   sequenzy.test.ts      → fireEvent (payload, auth header), fireEventAsync
 *
 * src/hooks/__tests__/
 *   authCache.test.ts     → readCache, writeCache, clearCache (localStorage)
 *
 * src/components/ui/__tests__/
 *   SkeletonShimmer.test.tsx → Skeleton props, className, style, numeric dimensions
 *
 * src/types/__tests__/
 *   types.test.ts         → CommunityPost, Lesson, Order — union type guards
 *
 * ─────────────────────────────────────────────────────────────
 * TESTES DE INTEGRAÇÃO (pages)
 * ─────────────────────────────────────────────────────────────
 *
 * src/pages/__tests__/
 *   CheckoutPage.test.tsx → Loading spinner enquanto produto carrega
 *                           Produto não encontrado → toast + navigate /products
 *                           Renderização: título, preço BRL, métodos de pagamento, trust badges
 *                           Usuário logado: campos auto-preenchidos e desabilitados
 *                           Seleção de método: PIX (padrão), Cartão, Boleto → dica contextual
 *                           Validação: nome obrigatório, email obrigatório, email inválido, ambos em simultâneo
 *                           Erro clearance: campo resets ao digitar
 *                           Checkout PIX sucesso: invoke com payload correto, toast, step "success", chave PIX
 *                           Checkout Crédito sucesso: navigate /obrigado com invoiceUrl + slug + method=credit
 *                           Checkout Boleto sucesso: step "success" com barCode
 *                           Payload com usuário logado: userId enviado corretamente
 *                           Erro edge function: toast de erro, sem navigate, botão re-habilitado, permanece no form
 *                           BRL formatting: 997,00 / 1.997,00, preço como string do DB, NaN → toast + redirect
 *
 *   LoginPage.test.tsx    → Rendering (inputs, botões, links)
 *                           Validação: campos vazios → toast, sem chamada de API
 *                           Login com sucesso: credenciais corretas, toast, navigate /dashboard
 *                           ?next= redirect: path válido vs open-redirect guard (//evil.com → /dashboard)
 *                           Login com erro: toast de erro, sem navigate, loading reset
 *                           Password toggle: eye icon alterna type password↔text
 *                           Google OAuth: loginWithGoogle chamado, erro exibido em toast
 *
 *   DashboardPage.test.tsx → Greeting com nome do usuário (Bom dia, Ana)
 *                            anonymous_name badge + avatar com inicial
 *                            Skeleton (.skeleton divs) durante loadingP e loadingC
 *                            Usuário COM produto: card de curso (título, thumbnail, link)
 *                            Usuário COM produto: lesson count "X de Y aulas" + progress %
 *                            Usuário COM produto: progress bar (.progress-bar-fill)
 *                            Usuário COM produto: stats gerais (concluídas, total, cursos)
 *                            Usuário COM múltiplos produtos: compact row cards + link correto
 *                            Usuário SEM produto: "Inicie sua jornada" empty state
 *                            Usuário SEM produto: upsell "Você chegou até aqui por um motivo"
 *                            Usuário SEM produto: CTA "Quero começar" → /checkout/mulher-espiral
 *                            Comunidade: títulos, anonymous_name, likes, comments, links
 *                            Comunidade: empty state "Nenhum post ainda"
 *                            Supabase: user_products.eq(user_id), community_posts.eq(is_visible)
 *                            Navegação: "Ver todos" → /products, "Ver tudo" → /community
 *                            Helmet: document.title contém "Início"
 *
 *   LessonPage.test.tsx   → Loading spinner (product pending)
 *                           Produto não encontrado → 'Ver meus cursos'
 *                           Paywall: user without product access → 'Conteúdo exclusivo'
 *                           Free lesson renders without paywall
 *                           Video: iframe com embed URL correto
 *                           Video: URL inválida → fallback 'Link de vídeo inválido'
 *                           Text: HTML via dangerouslySetInnerHTML
 *                           PDF: 'Abrir PDF' link + 'Arquivo PDF disponível'
 *                           Audio: <audio src=...> renderizado
 *                           markComplete: supabase.upsert com {user_id, lesson_id, completed: true}
 *                           markComplete: toast.success 'Aula concluída. ✦'
 *                           markComplete: badge 'Concluída' aparece
 *                           markComplete: já concluída → badge sem botão
 *                           markComplete: erro upsert → toast.error + reverted state
 *                           markComplete: fireEventAsync('lesson.completed') disparado
 *                           100% progress: setTimeout → modal 'Parabéns'
 *                           Modal: nome da aluna no heading
 *                           Modal: canvas para certificado
 *                           Modal: botão 'Baixar PNG'
 *                           Modal: link 'Certificado completo'
 *                           Modal: fireEventAsync('course.completed')
 *                           Modal: fechar via ✕
 *                           Navegação: breadcrumb /products/:slug, módulo título
 *                           Navegação: barra de progresso do módulo
 *
 *   AdminProductContentPage.test.tsx → Loading spinner antes dos dados carregarem
 *                              Renderização: título, subtítulo, overline, back link /admin/products
 *                              Accordion: módulos abrir/fechar, first open by default, segundo colapsado
 *                              Lesson count badge por módulo ('X aulas')
 *                              Lista de aulas: título, type badge (video/text/pdf), duration, GRÁTIS badge
 *                              Edit buttons: pencil (aria-label) e trash por aula
 *                              Inline edit: clicar lápis abre form com data-testid correto
 *                              Inline edit: title, type selector, duration pré-preenchidos
 *                              Inline edit: salvar chama supabase.update → toast 'Aula atualizada. ✦'
 *                              Inline edit: erro DB → toast.error
 *                              Inline edit: cancelar fecha form sem chamar update
 *                              Inline edit: dois lápis simultâneos bloqueados (disabled)
 *                              Inline edit: título vazio → toast.error sem chamar update
 *                              Inline edit: novo título aparece na lista após salvar
 *                              Add module: botão mostra form, submit chama insert com title
 *                              Add module: toast.success 'Módulo criado.'
 *                              Add module: título vazio → toast.error sem insert
 *                              Add module: cancelar fecha form
 *                              Add lesson: botão mostra form, submit chama insert com module_id/title/type
 *                              Add lesson: toast.success 'Aula criada.'
 *                              Add lesson: título vazio → toast.error sem insert
 *                              Delete lesson: trash → supabase.delete → aula removida da lista
 *                              Delete lesson: toast.success 'Aula removida.'
 *                              Delete module: trash → supabase.delete → toast 'Módulo removido.'
 *                              Certificate: painel colapsado por default
 *                              Certificate: toggle expande campos (instructor, tagline, etc.)
 *                              Certificate: 'Salvar configuração' → supabase.update products + toast
 *                              Certificate: botão 'Visualizar certificado' visível quando aberto
 *
 *   CommunityPage.test.tsx → Skeleton screens (.skeleton divs) durante loading
 *                              Category tabs: Todas, Geral, Desabafo, Dúvidas, Conquistas, Dicas
 *                              Filtro por categoria (geral, desabafo, conquistas, dúvidas, dicas)
 *                              'Todas' restaura todos os posts
 *                              Post card: title, body, anonymous_name, timeAgo (mocked '2h')
 *                              Post card: category badge, Flame icon em pinned, avatar inicial
 *                              Post card: 'Ver post' link → /community/topic/:id correto
 *                              Likes count renderizado (5, 12, 24…)
 *                              Like button: incremento otimista (5 → 6)
 *                              Like button: supabase.insert({ user_id, post_id })
 *                              Unlike: supabase.delete + decrement (5 → 4)
 *                              Like insert error: revert + toast.error
 *                              Empty state: 'Nenhum post nessa categoria.' + CTA 'Ser a primeira'
 *                              Anonymous pill: user.anonymous_name + '· identidade anônima'
 *                              'Novo post' button abre compose sheet
 *                              Compose: 'Novo post' heading + anonymous notice
 *                              Compose: category selector buttons, title input, body textarea
 *                              Compose: X fecha sheet
 *                              FAB (aria-label 'Novo post') abre compose sheet
 *                              Validation: título vazio → toast.error sem insert
 *                              Validation: body vazio → toast.error sem insert
 *                              Validation: ambos vazios → toast.error, postInsert não chamado
 *                              Submit: supabase.insert payload correto (user_id, category, title, body)
 *                              Submit: toast.success 'Post publicado. ✦'
 *                              Submit: fecha sheet após sucesso
 *                              Submit: novo post aparece no topo da lista sem reload
 *                              Submit: categoria selecionada no form enviada corretamente
 *                              Supabase: is_visible=true filter verificado
 *                              Supabase: community_likes.eq(user_id, 'user-001')
 *
 *   ProductsPage.test.tsx → Loading skeleton (.skeleton divs) durante fetch
 *                              Empty state ('Nenhum curso disponível') quando products=[]
 *                              Empty state: link '← Voltar ao dashboard'
 *                              Card com acesso: título, thumbnail, módulos, aulas count
 *                              Card com acesso: 'Progresso' label + 'X/Y · Z%'
 *                              Card com acesso: progress-bar-fill element
 *                              Card com acesso: CTA 'Continuar' quando progress > 0
 *                              Card com acesso: CTA 'Começar' quando progress = 0
 *                              Card com acesso: badge 'Concluído' + '5/5 · 100%' a 100%
 *                              Card com acesso: link correto /products/:slug
 *                              Card sem acesso: título, preço BRL, 'Adquirir' CTA → /checkout/:slug
 *                              Card sem acesso: 'Sem acesso' lock overlay
 *                              Card sem acesso: sem barra de progresso
 *                              Múltiplos produtos: Começar + Adquirir simultâneos
 *                              Supabase: user_products.eq(user_id) verificado
 *                              Helmet: document.title contém 'Meus Cursos'
 *                              Produto não encontrado → navigate('/products')
 *                              Acesso negado: 'Acesso necessário' + CTA /checkout/:slug
 *                              Acesso negado: free preview lessons com badge GRÁTIS
 *                              Acesso negado: sem seção preview quando não há aulas gratuitas
 *                              Acesso negado: sem accordion de módulos
 *                              Com acesso: título, subtítulo, X módulos, Y aulas no hero
 *                              Com acesso: '0 de 6 aulas' + barra de progresso
 *                              Com acesso: progresso parcial (40%) → '2 de 5 aulas'
 *                              Com acesso: CTA 'Começar' → /lesson/les-001 (0 concluídas)
 *                              Com acesso: CTA 'Continuar' → primeira aula não concluída
 *                              Com acesso: CTA 'Ver certificado' → /certificado (100%)
 *                              Com acesso: banner 'Parabéns! Curso concluído.' a 100%
 *                              Accordion: módulos renderizados, primeiro aberto por padrão
 *                              Accordion: segundo módulo colapsado, expande ao clicar
 *                              Accordion: clicar módulo aberto o colapsa
 *                              Accordion: contagem 'X/Y aulas concluídas' por módulo
 *                              Lesson links: href = /products/:slug/lesson/:lessonId
 *                              Labels: Vídeo, Leitura, PDF, Áudio
 *                              Duration: '12min', '20min', sem '0min'
 *                              Completed: CheckCircle + progresso atualizado
 *                              Stats strip: módulos, aulas, concluídas, progresso, M1/M2
 *                              Navegação: 'Meus Cursos' → navigate('/products')
 *                              Supabase: slug e user_id passados corretamente
 *
 *   RegisterPage.test.tsx → Step 1 (form):
 *                             Rendering: 4 campos, botão OTP, botão Google, link /login
 *                             Validação: name/email/password vazios, mismatch, senha < 6 chars
 *                             sendOtp chamado com email correto → transição para step 2
 *                             Email exibido no step 2
 *                             sendOtp falha: toast de erro, permanece no step 1
 *                             Google OAuth: loginWithGoogle('/dashboard') chamado
 *                           Step 2 (OTP):
 *                             Rendering: input OTP, botão confirmar, botão reenviar
 *                             Voltar: retorna ao step 1
 *                             Auto-submit ao digitar 4º dígito
 *                             verifyOtpAndRegister: args corretos (email, otp, password, name)
 *                             Sucesso: toast + navigate /dashboard
 *                             Erro: toast de erro, sem navigate, loading reset
 *                             Reenvio: estado de cooldown exibido
 *
 * ─────────────────────────────────────────────────────────────
 * COBERTURA (vitest.config.ts)
 * ─────────────────────────────────────────────────────────────
 *
 *   Include:  src/lib/**, src/hooks/**, src/pages/**
 *   Include:  src/lib/**, src/hooks/**, src/pages/**
 *   Exclude:  src/lib/supabase.ts, src/test/**, src/pages/admin/**,
 *             CertificatePage.tsx (canvas), LandingPage.tsx (e2e scope)
 *   Thresholds: lines 60%, functions 60%, branches 50%, statements 60%
 *
 * ─────────────────────────────────────────────────────────────
 * REFATORAÇÕES
 * ─────────────────────────────────────────────────────────────
 *   - src/lib/dateUtils.ts       NOVO — timeAgo, greeting, formatBRL, progressPct, clamp, truncate, capitalize, initials
 *   - DashboardPage.tsx          timeAgo + greeting → import de @/lib/dateUtils
 *   - CommunityPage.tsx          timeAgo → import de @/lib/dateUtils
 *   - SkeletonShimmer.tsx        suporte a width/height numérico, cleanup de SKELETON_STYLES obsoleto
 *   - vitest.config.ts           config Vitest jsdom + alias @/ + coverage thresholds
 *   - src/test/setup.ts          jest-dom, cleanup, stubs browser APIs
 *   - src/test/mocks/supabase.ts mock reutilizável do cliente Supabase
 */
