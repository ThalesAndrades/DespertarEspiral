import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split heavy vendor libraries into stable, cacheable chunks so a change
        // in app code doesn't bust the whole vendor bundle, and route-level code
        // splitting only pulls the vendors it actually needs.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // react-vendor must be dependency-closed: everything react-dom and
          // react-router-dom pull in (scheduler, react-router, @remix-run/router)
          // has to live in the SAME chunk, or vendor <-> react-vendor become a
          // circular import and React is undefined when the router initializes.
          // JA FOI REVERTIDO uma vez por commit externo "onspace.ai" (18/08,
          // 9ef7459) e o site voltaria a subir em TELA BRANCA. Nao simplificar.
          if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id) || id.includes("@remix-run")) return "react-vendor";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("three")) return "three";
          if (id.includes("xlsx")) return "xlsx";
          if (/recharts|d3-|victory|chart/.test(id)) return "charts";
          if (id.includes("@google/generative-ai")) return "genai";
          return "vendor";
        },
      },
    },
  },
});
