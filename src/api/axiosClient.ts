// src/api/axiosClient.ts
import axios from "axios";

// 👇 En desarrollo usamos SIEMPRE el backend local.
// En producción (Vercel) usamos la URL de Render del .env.
const baseURL =
  import.meta.env.DEV
    ? "http://localhost:8080"
    : import.meta.env.VITE_API_BASE_URL;

const axiosClient = axios.create({
  baseURL,
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosClient;
