// src/pages/LoginPage.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

type UserMini = {
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
};

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login, updateUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const emailTrimmed = email.trim();

    try {
      const response = await axiosClient.post("/auth/login", {
        email: emailTrimmed,
        password,
      });

      console.log("LOGIN RESPONSE:", response.data);
      const data = response.data;

      const apiUser = data.user ?? {
        id: data.id,
        email: data.email,
        name: data.name,
      };

      const safeUser = {
        id: apiUser?.id ?? 0,
        email: apiUser?.email ?? emailTrimmed,
        name: apiUser?.name ?? "",
      };

      const token =
        data.token ??
        data.accessToken ??
        data.jwt ??
        data.authToken ??
        "";

      // ✅ 1) Login básico (set user + token)
      login(safeUser, token);

      // ✅ 2) Cargar perfil real desde backend (nombre + avatar Cloudinary)
      // Esto hace que en cualquier PC salga "Hola Alberto" y la foto
      try {
        const miniRes = await axiosClient.get<UserMini>("/users/by-email", {
          params: { email: emailTrimmed },
        });

        const fullName = (miniRes.data?.fullName || "").trim();
        const avatarUrl = (miniRes.data?.avatarUrl || "").trim();

        updateUser({
          name: fullName || safeUser.name || emailTrimmed,
          avatarUrl: avatarUrl || undefined,
        });
      } catch (e2) {
        // Si falla, no rompemos login; solo seguirá con fallback (aperez)
        console.warn("Could not load user mini profile:", e2);
      }

      navigate("/dashboard");
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
