import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "@/lib/helmet";
import { Toaster } from "sonner";
import App from "./App";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/lib/ErrorBoundary";
import { captureAttribution } from "@/lib/analytics";
import { initMotionControl } from "@/lib/motionControl";
import "./index.css";

/* ── UTM attribution capture — on first load ── */
captureAttribution();

/* ── Pause decorative animations when tab is hidden / off-screen ── */
initMotionControl();

/* ── React Query — optimized defaults ── */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,         // 1 min — less refetching
      gcTime: 5 * 60_000,        // 5 min garbage collection
      refetchOnWindowFocus: false, // prevent surprise refetches on mobile tab switch
    },
  },
});

/* ── Theme detection — sync before paint ── */
const initialTheme = ((): "dark" | "light" => {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch { return "dark"; }
})();

/* Apply theme attribute immediately to prevent flash */
document.documentElement.setAttribute("data-theme", initialTheme);

/* ── Mount ou hidratação ──
   A home chega PRÉ-RENDERIZADA do build (dist/prerender/home.html): quando o
   root já tem filhos, hidrata em vez de montar do zero — jogar o DOM fora e
   remontar desperdiçaria exatamente o HTML que o prerender pagou para servir.
   Nas demais rotas o fallback do SPA serve a casca vazia e o createRoot segue
   como sempre foi. A árvore abaixo é ESPELHADA em src/entry-server.tsx — mudou
   aqui, mude lá, ou a hidratação da home degrada em remontagem com aviso. */
const raiz = document.getElementById("root")!;
const arvore = (
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <BrowserRouter>
            <AuthProvider>
              <App />
              <Toaster
                position="top-right"
                theme={initialTheme}
                richColors={false}
                closeButton
                toastOptions={{
                  duration: 4000,
                  style: {
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "14px",
                    borderRadius: "14px",
                  },
                  classNames: {
                    toast: "toaster-brand",
                  },
                }}
              />
            </AuthProvider>
          </BrowserRouter>
        </HelmetProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

if (raiz.hasChildNodes()) {
  ReactDOM.hydrateRoot(raiz, arvore);
} else {
  ReactDOM.createRoot(raiz).render(arvore);
}
