import React from "react";

export default function TermsPage() {
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
        <h1 style={{ marginTop: 0, fontSize: "2rem" }}>Terms of Use – Rycus</h1>

        <p>
          <strong>Effective Date:</strong> March 30, 2026
        </p>

        <p>By using Rycus, you agree to these Terms of Use.</p>

        <h2>1. Use of the Service</h2>
        <p>
          Rycus provides a platform for users to share information, reviews, and
          connect with others.
        </p>
        <p>You agree to use the Service lawfully and respectfully.</p>

        <h2>2. User Accounts</h2>
        <p>You are responsible for:</p>
        <ul>
          <li>Maintaining your login credentials</li>
          <li>All activity under your account</li>
        </ul>

        <h2>3. User Content</h2>
        <p>You may post content including reviews, comments, and messages.</p>
        <p>You agree NOT to post:</p>
        <ul>
          <li>False or misleading information</li>
          <li>Offensive, abusive, or harmful content</li>
          <li>Illegal content</li>
        </ul>
        <p>We may remove content at our discretion.</p>

        <h2>4. Account Termination</h2>
        <p>We may suspend or terminate accounts that violate these terms.</p>

        <h2>5. Payments</h2>
        <p>Some features may require a subscription.</p>
        <p>Payments are handled through third-party providers.</p>

        <h2>6. Disclaimer</h2>
        <p>The Service is provided "as is" without warranties.</p>
        <p>We do not guarantee accuracy of user-generated content.</p>

        <h2>7. Limitation of Liability</h2>
        <p>Rycus is not responsible for damages resulting from use of the platform.</p>

        <h2>8. Changes to Terms</h2>
        <p>We may update these terms at any time.</p>

        <h2>9. Contact</h2>
        <p>
          For questions, contact: <strong>support@rycus.app</strong>
        </p>
      </div>
    </div>
  );
}