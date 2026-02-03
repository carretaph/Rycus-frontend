// src/pages/ActivatePage.tsx
import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

const ActivatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const email = (user?.email || "").trim();

  // si vienes redirigido desde ProtectedRoute con state.from
  const fromPath = useMemo(() => {
    const state = location.state as any;
    return typeof state?.from === "string" ? state.from : "";
  }, [location.state]);

  const handleStartTrial = async () => {
    setMsg("");
    if (!email) {
      setMsg("Please log in again.");
      navigate("/login", { replace: true });
      return;
    }

    try {
      setLoading(true);

      // ✅ aseguramos que siga bloqueado hasta que Stripe confirme
      updateUser({ hasAccess: false });

      // Ajusta este endpoint si tu backend usa otro nombre:
      // ejemplo: /billing/checkout o /billing/create-checkout-session
      const res = await axios.post("/billing/checkout", {
        email,
        // opcional: manda el return path para que luego de pagar vuelvas ahí
        returnTo: fromPath || "/dashboard",
      });

      const url = res.data?.url || res.data?.checkoutUrl;
      if (!url) {
        setMsg("Could not start checkout. Missing checkout URL.");
        return;
      }

      // redirect a Stripe Checkout
      window.location.href = url;
    } catch (e: any) {
      console.error(e);
      const serverMsg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        (typeof e?.response?.data === "string" ? e.response.data : "") ||
        e?.message ||
        "Checkout failed.";
      setMsg(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleNotNow = () => {
    // ✅ como tu regla es “sin tarjeta no hay acceso”, lo más sano es sacarlo
    logout();
    navigate("/login", { replace: true });
  };

  const handleGoToProfile = () => {
    // ✅ como profile está bloqueado por billing, aquí damos feedback real
    setMsg("Profile is locked until you activate your subscription.");
    // Si prefieres, lo puedes mandar a /activate siempre (ya está aquí)
    // navigate("/activate", { replace: true });
  };

  return (
    <div className="page">
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <h1 style={{ fontSize: 34, marginBottom: 6 }}>Unlock Rycus Pro</h1>
        <p style={{ marginTop: 0, color: "#555" }}>
          $0.99/month after a <b>30-day free trial</b>. Cancel anytime.
        </p>

        {msg && (
          <div
            style={{
              marginTop: 12,
              marginBottom: 12,
              padding: 12,
              borderRadius: 10,
              border: "1px solid #f3c6c6",
              background: "#fff5f5",
              color: "#8a1f1f",
            }}
          >
            {msg}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginTop: 18,
          }}
        >
          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ marginTop: 0 }}>What you get</h3>
            <ul style={{ marginBottom: 0, lineHeight: 1.8 }}>
              <li>Full access to Customers, Reviews, Network & Messages</li>
              <li>Customer map + dashboard metrics</li>
              <li>Unlimited review tracking</li>
            </ul>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ marginTop: 0 }}>Rewards promotion 🎁</h3>
            <div style={{ lineHeight: 1.7 }}>
              Earn <b>1 free month</b> for every <b>10 reviews</b>. <br />
              Max <b>3 free months</b> (30 reviews).
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 10,
                  background: "#f7f7ff",
                  border: "1px solid #e8e8ff",
                }}
              >
                Example: 10 reviews → +1 month, 20 reviews → +2 months, 30 reviews
                → +3 months.
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
          <button
            className="btn-primary"
            type="button"
            onClick={handleStartTrial}
            disabled={loading}
          >
            {loading ? "Starting..." : "Start 30-day trial"}
          </button>

          <button
            className="btn-secondary"
            type="button"
            onClick={handleNotNow}
            disabled={loading}
          >
            Not now
          </button>

          {/* Si quieres que sea link real: cámbialo a <Link to="/profile">...
              pero como profile está bloqueado por billing, aquí damos feedback claro */}
          <button
            className="btn-link"
            type="button"
            onClick={handleGoToProfile}
            disabled={loading}
            style={{ background: "transparent", border: "none", color: "#2b59ff" }}
          >
            Go to Profile
          </button>
        </div>

        <p style={{ marginTop: 10, color: "#666" }}>
          Signed in as <b>{email || "unknown"}</b>.
        </p>

        {/* opcional: si quieres ofrecer salida al home público */}
        <div style={{ marginTop: 8 }}>
          <Link to="/login">Switch account</Link>
        </div>
      </div>
    </div>
  );
};

export default ActivatePage;
