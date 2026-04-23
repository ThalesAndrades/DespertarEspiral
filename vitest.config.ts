/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
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
