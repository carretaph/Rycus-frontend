import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

const ActivatePage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const canceled = params.get("canceled") === "1";

  const startTrial = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.post("/billing/checkout");
      const url = res.data?.url;
      if (!url) throw new Error("Missing checkout URL");
      window.location.href = url;
    } catch (err) {
      console.error(err);
      alert("Could not start checkout. Please try again.");
      setLoading(false);
    }
  };

  const goDashboard = () => navigate("/dashboard");

  return (
    <div className="page" style={{ maxWidth: 820, margin: "40px auto", padding: 20 }}>
      <h1 style={{ fontSize: 34, marginBottom: 10 }}>Unlock Rycus Pro</h1>
      <p style={{ fontSize: 16, lineHeight: 1.5, marginBottom: 18 }}>
        $0.99/month after a <b>30-day free trial</b>. Cancel anytime.
      </p>

      {canceled && (
        <div style={{ padding: 12, border: "1px solid #f0c36d", borderRadius: 10, marginBottom: 18 }}>
          <b>Checkout canceled.</b> You can try again anytime.
        </div>
      )}

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ padding: 16, border: "1px solid #e7e7e7", borderRadius: 12 }}>
          <h3 style={{ marginTop: 0 }}>What you get</h3>
          <ul style={{ lineHeight: 1.7 }}>
            <li>Full access to Customers, Reviews, Network & Messages</li>
            <li>Customer map + dashboard metrics</li>
            <li>Unlimited review tracking</li>
          </ul>
        </div>

        <div style={{ padding: 16, border: "1px solid #e7e7e7", borderRadius: 12 }}>
          <h3 style={{ marginTop: 0 }}>Rewards promotion 🎁</h3>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            Earn <b>1 free month</b> for every <b>10 reviews</b>.
            <br />
            Max <b>3 free months</b> (30 reviews).
          </p>
          <div style={{ marginTop: 12, padding: 12, background: "#fafafa", borderRadius: 10 }}>
            Example: 10 reviews → +1 month, 20 reviews → +2 months, 30 reviews → +3 months.
          </div>
        </div>
      </div>

      <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={startTrial}
          disabled={loading}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontWeight: 700
          }}
        >
          {loading ? "Opening checkout..." : "Start 30-day trial"}
        </button>

        <button
          onClick={goDashboard}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "transparent",
            cursor: "pointer"
          }}
        >
          Not now
        </button>

        <Link to="/profile" style={{ alignSelf: "center" }}>
          Go to Profile
        </Link>
      </div>

      <p style={{ marginTop: 14, color: "#666" }}>
        {user?.email ? <>Signed in as <b>{user.email}</b>.</> : <>Please sign in first.</>}
      </p>
    </div>
  );
};

export default ActivatePage;
