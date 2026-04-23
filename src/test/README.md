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
