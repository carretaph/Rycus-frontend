// src/api/axiosClient.ts
import axios from "axios";

// 👇 En desarrollo usamos SIEMPRE el backend local.
// En producción (Vercel) usamos la URL de Render del .env.
const baseURL = import.meta.env.DEV
  ? "http://localhost:8080"
  : import.meta.env.VITE_API_BASE_URL;

const axiosClient = axios.create({ baseURL });

// ✅ intenta varios keys + sessionStorage
function getToken(): string | null {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("rycus_token") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("rycus_token") ||
    sessionStorage.getItem("authToken")
  );
}

axiosClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosClient;
