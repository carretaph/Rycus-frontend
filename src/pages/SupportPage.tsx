import React from "react";

export default function SupportPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "40px 20px",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          lineHeight: 1.7,
        }}
      >
        <h1 style={{ marginTop: 0, fontSize: "2rem" }}>Rycus Support</h1>

        <p>
          If you need help, contact us at: <strong>support@rycus.app</strong>
        </p>

        <p>We typically respond within 24–48 hours.</p>

        <h2>Common Issues</h2>
        <ul>
          <li>Login problems</li>
          <li>Account access</li>
          <li>Reporting a user</li>
          <li>Billing questions</li>
        </ul>

        <p>Thank you for using Rycus.</p>
      </div>
    </div>
  );
}