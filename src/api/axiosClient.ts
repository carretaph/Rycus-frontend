// src/api/axiosClient.ts
import axios from "axios";

// 👇 En desarrollo usamos SIEMPRE el backend local.
// En producción (Vercel) usamos la URL de Render del .env.
const baseURL = import.meta.env.DEV
  ? "http://localhost:8080"
  : import.meta.env.VITE_API_BASE_URL;

const axiosClient = axios.create({ baseURL });

// ✅ Fuente de verdad: rycus_token
// ✅ Fallback: token/authToken (por builds viejos)
function getToken(): string | null {
  return (
    localStorage.getItem("rycus_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("rycus_token") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken")
  );
}

axiosClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  } else {
    // por si quedó una cabecera vieja
    if (config.headers) delete (config.headers as any).Authorization;
  }
  return config;
});

export default axiosClient;
