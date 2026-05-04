// src/pages/ActivatePage.tsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

const ActivatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const email = (user?.email || "").trim();

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      try {
        const res = await axios.get("/users/me");
        const fresh = res.data;

        if (!mounted) return;

        const hasAccess =
          fresh?.hasAccess === true ||
          fresh?.subscriptionStatus === "active" ||
          fresh?.subscriptionStatus === "trialing" ||
          fresh?.planType === "FREE_LIFETIME" ||
          String(fresh?.planType || "").toLowerCase() === "owner";

        updateUser(fresh);

        if (hasAccess) {
          navigate("/home", { replace: true });
        }
      } catch (e) {
        console.warn("Access refresh failed", e);
      }
    };

    checkAccess();

    return () => {
      mounted = false;
    };
    // Runs once on page load to avoid redirect loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartTrial = async () => {
    setMsg("");

    if (!email) {
      setMsg("Please log in again.");
      navigate("/login", { replace: true });
      return;
    }

    try {
      setLoading(true);
      updateUser({ hasAccess: false });

      const token =
        localStorage.getItem("rycus_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("token");

      console.log("Checkout token exists?", !!token);

      const res = await axios.post("/billing/checkout", null, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const url = res.data?.url || res.data?.checkoutUrl;

      if (!url) {
        setMsg("Could not start checkout. Missing checkout URL.");
        return;
      }

      window.location.href = url;
    } catch (e: any) {
      console.error("Checkout error:", e);

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
    logout();
    navigate("/login", { replace: true });
  };

  const handleGoToProfile = () => {
    setMsg("Profile is locked until you activate your subscription.");
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
                Example: 10 reviews → +1 month, 20 reviews → +2 months, 30
                reviews → +3 months.
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

          <button
            className="btn-link"
            type="button"
            onClick={handleGoToProfile}
            disabled={loading}
            style={{
              background: "transparent",
              border: "none",
              color: "#2b59ff",
            }}
          >
            Go to Profile
          </button>
        </div>

        <p style={{ marginTop: 10, color: "#666" }}>
          Signed in as <b>{email || "unknown"}</b>.
        </p>

        <div style={{ marginTop: 8 }}>
          <Link to="/login">Switch account</Link>
        </div>
      </div>
    </div>
  );
};

export default ActivatePage;