// src/api/axiosClient.ts
import axios from "axios";

/**
 * ==========================================================
 * BASE URL
 * ----------------------------------------------------------
 * DEV  → decide por ENV si quieres pegarle a PROD
 *        - si VITE_API_BASE_URL existe, usa eso
 *        - si no existe, usa proxy de Vite ("")
 *
 * PROD → usa VITE_API_BASE_URL
 * ==========================================================
 */

const envBase = import.meta.env.VITE_API_BASE_URL?.trim();

// En DEV: si definiste VITE_API_BASE_URL, úsalo. Si no, usa proxy.
const baseURL = import.meta.env.DEV ? (envBase ? envBase : "") : (envBase || "");

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
    const token = localStorage.getItem("token");
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
 * - Maneja Network errors y 401 global
 * ==========================================================
 */
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    // 401 → limpia sesión y manda al login
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
