/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
    // Sem limite de pool, rodar as 19 suites juntas estoura o heap e derruba
    // arquivos INTEIROS em cascata — CheckoutPage e CourseViewPage apareciam
    // com 100% de falha quando, isoladas, passam 36/36 e 54/55.
    // Processos isolados + concorrencia limitada trocam alguns segundos de
    // duracao por um resultado que corresponde a realidade.
    pool: "forks",
    poolOptions: {
      forks: { minForks: 1, maxForks: 2 },
    },
    testTimeout: 20000,
    hookTimeout: 20000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: [
        "src/lib/**",
        "src/hooks/**",
        "src/pages/**",
      ],
      exclude: [
        "src/lib/supabase.ts",
        "src/test/**",
        "src/pages/admin/**",           // admin pages — excluded for brevity
        "src/pages/CertificatePage.tsx", // canvas-heavy, tested separately
        "src/pages/LandingPage.tsx",     // marketing page, e2e scope
      ],
      thresholds: {
        lines:      60,
        functions:  60,
        branches:   50,
        statements: 60,
      },
    },
  },
});
