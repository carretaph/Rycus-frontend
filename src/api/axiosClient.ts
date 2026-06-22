// src/api/axiosClient.ts
import axios from "axios";
import { Capacitor } from "@capacitor/core";

/**
 * ==========================================================
 * BASE URL STRATEGY (ANDROID + IOS + WEB + PROD)
 * ==========================================================
 */

const RENDER_API_BASE = "https://rycus-backend.onrender.com";

const envBaseRaw = import.meta.env.VITE_API_BASE_URL;
const envBase = envBaseRaw?.trim();
const isDev = import.meta.env.DEV;
const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform();

/**
 * LOGICA FINAL:
 * - Android emulator → 10.0.2.2:8080 (SIEMPRE prioridad)
 * - Override manual por env → web / iOS / otros casos
 * - iOS / native → Render
 * - Web dev → localhost
 * - Prod → Render
 */
const baseURL = isNative
  ? RENDER_API_BASE
  : envBase && envBase.length > 0
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
  timeout: 300000,
});

/**
 * ==========================================================
 * REQUEST INTERCEPTOR
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
console.log("🧪 ENV BASE URL →", envBaseRaw);
console.log("📱 Native app? →", isNative);
console.log("📱 Platform →", platform);
console.log("🧪 DEV mode? →", isDev);

export default axiosClient;