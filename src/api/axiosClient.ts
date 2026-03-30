// src/api/axiosClient.ts
import axios from "axios";
import { Capacitor } from "@capacitor/core";

/**
 * ==========================================================
 * BASE URL STRATEGY (STABLE VERSION)
 *
 * PRIORIDAD:
 *
 * 1) VITE_API_BASE_URL → override manual
 * 2) DEV (web o simulator) → localhost
 * 3) PROD → Render
 *
 * 👉 Eliminamos IP fija (causaba errores)
 * ==========================================================
 */

const RENDER_API_BASE = "https://rycus-backend.onrender.com";

const envBase = import.meta.env.VITE_API_BASE_URL?.trim();
const isDev = import.meta.env.DEV;

// 🔥 CLAVE: usar localhost para TODO en dev (web + iOS simulator)
const baseURL =
  envBase && envBase.length > 0
    ? envBase
    : isDev
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
console.log("📱 Native app? →", Capacitor.isNativePlatform());
console.log("🧪 DEV mode? →", isDev);

export default axiosClient;