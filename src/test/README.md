/**
 * README — Testes unitários
 *
 * Stack: Vitest + @testing-library/react + jsdom
 *
 * Comandos:
 *   npx vitest                  → watch mode
 *   npx vitest run              → single run (CI)
 *   npx vitest run --coverage   → coverage report
 *
 * Cobertura dos módulos testados:
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
 * Refatorações aplicadas neste sprint:
 *   - src/lib/dateUtils.ts       NOVO — timeAgo, greeting, formatBRL, progressPct, clamp, truncate, capitalize, initials
 *   - DashboardPage.tsx          timeAgo + greeting → import de @/lib/dateUtils
 *   - CommunityPage.tsx          timeAgo → import de @/lib/dateUtils
 *   - SkeletonShimmer.tsx        suporte a width/height numérico, cleanup de SKELETON_STYLES obsoleto
 *   - vitest.config.ts           NOVO — config Vitest com jsdom + alias @/
 *   - src/test/setup.ts          NOVO — jest-dom, cleanup, stubs browser APIs
 *   - src/test/mocks/supabase.ts NOVO — mock reutilizável do cliente Supabase
 */
