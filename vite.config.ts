// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * ==========================================================
 * VITE CONFIG — RYCUS FRONTEND
 * ----------------------------------------------------------
 * ✔ Proxy local hacia Spring Boot :8080
 * ✔ Evita CORS / Network Error
 * ✔ Funciona aunque cambie puerto 5173 → 5174
 * ==========================================================
 */

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    strictPort: false, // si está ocupado usa 5174 / 5175
    host: true,

    proxy: {
      /**
       * ==========================
       * AUTH
       * ==========================
       */
      "/auth": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },

      /**
       * ==========================
       * USERS / PROFILE
       * ==========================
       */
      "/users": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },

      /**
       * ==========================
       * CORE APP
       * ==========================
       */
      "/customers": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },

      "/reviews": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },

      "/connections": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },

      "/messages": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },

      "/milestones": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },

      /**
       * ==========================
       * BILLING / STRIPE
       * ==========================
       */
      "/billing": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  /**
   * ==========================================================
   * BUILD (opcional pero recomendado)
   * ==========================================================
   */
  build: {
    chunkSizeWarningLimit: 800, // evita warning 500kb
  },
});
