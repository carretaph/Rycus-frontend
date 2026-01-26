// src/pages/LoginPage.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

type SafeUserFromApi = {
  id?: number | null;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  businessName?: string | null;
  city?: string | null;
  state?: string | null;
};

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const emailTrimmed = email.trim().toLowerCase();

    try {
      const response = await axiosClient.post("/auth/login", {
        email: emailTrimmed,
        password,
      });

      const data = response.data ?? {};

      // ✅ Token robusto + FAIL si falta
      const token =
        data.token ??
        data.accessToken ??
        data.jwt ??
        data.authToken ??
        null;

      if (!token || typeof token !== "string" || token.trim() === "") {
        throw new Error(
          "Login succeeded but token is missing. Backend must return { token: '...' }."
        );
      }

      // ✅ user seguro desde backend (AuthResponse.user)
      const u: SafeUserFromApi | null = data.user ?? null;

      const fullName = (u?.fullName || "").trim();
      const avatarUrl = (u?.avatarUrl || "").trim();

      // ✅ Construye user para AuthContext
      const safeUser = {
        id: Number(u?.id ?? 0),
        email: (u?.email || emailTrimmed).trim(),
        name: fullName || emailTrimmed.split("@")[0], // ✅ Welcome Sandra
        avatarUrl: avatarUrl || undefined,            // ✅ Header avatar
        phone: (u?.phone || "").trim() || undefined,
        businessName: (u?.businessName || "").trim() || undefined,
        city: (u?.city || "").trim() || undefined,
        state: (u?.state || "").trim() || undefined,
      };

      // ✅ NO guardes "token" legacy aquí (tu AuthContext ya migra). 
      // Si quieres compatibilidad, está bien, pero no es necesario.
      // localStorage.setItem("token", token);

      // ✅ Login: AuthContext guarda token y user
      login(safeUser, token);

      // ✅ ve al home (tu app usa FeedPage en /home)
      navigate("/home");
    } catch (err: any) {
      console.error("Login error:", err);

      let msg = "Login failed. Please try again.";
      if (err?.response) {
        const status = err.response.status;
        const data = err.response.data;
        msg = `Error ${status}: `;
        if (typeof data === "string") msg += data;
        else if (data?.message) msg += data.message;
        else if (data?.error) msg += data.error;
        else msg += JSON.stringify(data);
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card">
        <h1 className="card-title">Sign in to Rycus</h1>
        <p className="card-subtitle">
          Enter your email and password to access your account.
        </p>

        {error && (
          <p style={{ color: "#b91c1c", marginBottom: "12px", fontSize: "13px" }}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-grid-full">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-grid-full">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="auth-footer-text">
          Don’t have an account? <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
