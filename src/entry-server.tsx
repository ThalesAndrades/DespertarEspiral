/**
 * entry-server — renderiza as páginas públicas em HTML no BUILD (prerender).
 *
 * Por que existe: o index.html servido era uma casca vazia ("requer
 * JavaScript") — Bing, prévia de link e crawlers de IA viam zero conteúdo.
 * Este módulo roda em Node, no build (scripts/prerender.mjs), nunca no
 * navegador e nunca num servidor vivo: o deploy continua 100% estático.
 *
 * A árvore de providers ESPELHA a de src/main.tsx (menos analytics e tema,
 * que são efeitos de navegador) — a home é HIDRATADA pelo cliente, e árvore
 * diferente entre servidor e cliente é mismatch de hidratação.
 */
import React from "react";
import { renderToString, renderToPipeableStream } from "react-dom/server";
import { Writable } from "node:stream";
import { StaticRouter } from "react-router-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "@/lib/helmet";
import { Toaster } from "sonner";
import App from "./App";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/lib/ErrorBoundary";

export function renderPagina(url: string): Promise<string> {
  // Um QueryClient POR RENDER: compartilhá-lo entre páginas vazaria estado de
  // uma para a outra dentro do mesmo processo de build.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
      },
    },
  });

  const arvore = (
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <HelmetProvider>
            <StaticRouter location={url}>
              <AuthProvider>
                <App />
                <Toaster position="top-right" theme="dark" richColors={false} closeButton />
              </AuthProvider>
            </StaticRouter>
          </HelmetProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );

  // Stream com onAllReady, e não renderToString: a landing tem decorativos em
  // React.lazy, e o renderToString despacha o FALLBACK do Suspense — na
  // hidratação isso vira o erro #419 do React (cinco vezes, um por enfeite) e
  // remontagem do boundary. O onAllReady espera os lazy resolverem no Node e
  // entrega o HTML completo, que hidrata em silêncio.
  return new Promise((resolver, rejeitar) => {
    let html = "";
    const ralo = new Writable({
      write(pedaco, _enc, continua) {
        html += pedaco;
        continua();
      },
    });
    ralo.on("finish", () => resolver(html));
    const { pipe } = renderToPipeableStream(arvore, {
      onAllReady() {
        pipe(ralo);
      },
      onError(erro) {
        rejeitar(erro instanceof Error ? erro : new Error(String(erro)));
      },
    });
  });
}

/**
 * /termos e /privacidade são React.lazy no App — renderToString devolveria o
 * spinner do Suspense, não o texto. Aqui elas entram por import ESTÁTICO e
 * saem como página completa SEM hidratação (o prerender remove o script):
 * texto legal é documento, não aplicação — link nelas navega de verdade.
 */
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import TermsOfUsePage from "@/pages/TermsOfUsePage";

export function renderEstatica(url: "/termos" | "/privacidade"): string {
  const queryClient = new QueryClient();
  const Pagina = url === "/termos" ? TermsOfUsePage : PrivacyPolicyPage;
  return renderToString(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <HelmetProvider>
            <StaticRouter location={url}>
              <AuthProvider>
                <Pagina />
              </AuthProvider>
            </StaticRouter>
          </HelmetProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
