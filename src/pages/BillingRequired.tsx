import React from "react";

const BillingRequired: React.FC = () => {
  const goToBilling = () => {
    window.location.href = "/profile"; // o donde tengas el botón “Start Trial”
  };

  return (
    <div style={{ maxWidth: 520, margin: "80px auto", padding: 20 }}>
      <h2 style={{ fontSize: 24, marginBottom: 10 }}>🔒 Subscription inactive</h2>
      <p style={{ lineHeight: 1.5 }}>
        Your subscription is inactive. Activate to continue using Rycus.
      </p>
      <button
        onClick={goToBilling}
        style={{ marginTop: 16, padding: "10px 14px", cursor: "pointer" }}
      >
        Activate subscription
      </button>
    </div>
  );
};

export default BillingRequired;
