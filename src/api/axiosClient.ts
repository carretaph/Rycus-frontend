// src/api/axiosClient.ts
import axios from "axios";
import { Capacitor } from "@capacitor/core";

/**
 * ==========================================================
 * BASE URL STRATEGY
 * ----------------------------------------------------------
 * PRIORIDAD:
 *
 * 1) Si existe VITE_API_BASE_URL -> usar esa
 * 2) Si corre en app nativa (iPhone / Android via Capacitor) -> Render
 * 3) Si corre en DEV web -> localhost:8080
 * 4) Si corre en PROD web -> Render
 *
 * Esto evita el error de login en el simulador, porque
 * "localhost:8080" no debe usarse dentro de la app móvil.
 * ==========================================================
 */

const RENDER_API_BASE = "https://rycus-backend.onrender.com";

const envBase = import.meta.env.VITE_API_BASE_URL?.trim();
const isNativeApp = Capacitor.isNativePlatform();

const baseURL =
  envBase && envBase.length > 0
    ? envBase
    : isNativeApp
    ? RENDER_API_BASE
    : import.meta.env.DEV
    ? "http://localhost:8080"
    : RENDER_API_BASE;

/**
 * ==========================================================
 * AXIOS INSTANCE
 * ==========================================================
 */
const axiosClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 20000,
});

/**
 * ==========================================================
 * REQUEST INTERCEPTOR
 * - Adjunta JWT automáticamente
 * ==========================================================
 */
axiosClient.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("rycus_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("token");

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * ==========================================================
 * RESPONSE INTERCEPTOR
 * - Maneja 401 global
 * ==========================================================
 */
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      console.warn("⚠️ Session expired → redirecting to login");

      localStorage.removeItem("rycus_token");
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");

      localStorage.removeItem("rycus_user");
      localStorage.removeItem("user");

      sessionStorage.removeItem("token");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

/**
 * ==========================================================
 * DEBUG
 * ==========================================================
 */
console.log("🌐 API BASE URL →", baseURL);
console.log("📱 Native app? →", isNativeApp);

export default axiosClient;