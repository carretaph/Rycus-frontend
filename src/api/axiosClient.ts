// src/api/axiosClient.ts
import axios from "axios";

/**
 * ==========================================================
 * BASE URL STRATEGY
 * ----------------------------------------------------------
 * PRIORIDAD:
 *
 * 1️⃣ Si existe VITE_API_BASE_URL → usa esa
 * 2️⃣ Si NO existe:
 *      DEV  → usa backend LOCAL (8080)
 *      PROD → usa misma URL del host
 *
 * Esto evita pegarle accidentalmente a Render
 * cuando estás desarrollando avatars / posts.
 * ==========================================================
 */

const envBase = import.meta.env.VITE_API_BASE_URL?.trim();

const baseURL =
  envBase && envBase.length > 0
    ? envBase
    : import.meta.env.DEV
    ? "http://localhost:8080"
    : "";

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
    // ✅ En tu app el token está en 'rycus_token' (según consola)
    // Mantengo fallback por compatibilidad
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

      // limpia todas las keys posibles para evitar estados raros
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
 * DEBUG (solo DEV)
 * ==========================================================
 */
if (import.meta.env.DEV) {
  console.log("🌐 API BASE URL →", baseURL);
}

export default axiosClient;
