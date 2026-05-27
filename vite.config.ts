import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  // Hostinger serve a partir do domínio raiz; trocar se for hospedar em subpasta.
  base: "/",

  server: {
    host: "::",
    port: 8080,
  },

  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    target: "es2020",
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-three": [
            "three",
            "@react-three/fiber",
            "@react-three/drei",
            "@react-three/rapier",
          ],
          "vendor-charts": ["chart.js", "recharts"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
          "vendor-motion": ["framer-motion"],
          "vendor-pdf": ["jspdf", "qrcode"],
          "vendor-xlsx": ["xlsx"],
          "vendor-ai": ["@google/generative-ai"],
        },
      },
    },
  },
});
