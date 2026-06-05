import { useNavigate } from "react-router-dom";

export default function CommunityGuidelinesPage() {
  const navigate = useNavigate();

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
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            marginBottom: "20px",
            padding: "10px 16px",
            borderRadius: "999px",
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#0f172a",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          ← Back to Sign Up
        </button>

        <h1 style={{ marginTop: 0, fontSize: "2rem" }}>
          Community Guidelines – Rycus
        </h1>

        <p>
          <strong>Effective Date:</strong> March 30, 2026
        </p>

        <p>
          Rycus is a professional network for sharing customer experiences,
          reviews, referrals, and business connections. All users are expected
          to act respectfully, honestly, and responsibly.
        </p>

        <h2>1. Be Respectful</h2>
        <p>
          Do not harass, threaten, bully, intimidate, or abuse other users.
          Personal attacks, hate speech, and discriminatory language are not
          allowed.
        </p>

        <h2>2. No Objectionable Content</h2>
        <p>You may not post content that is:</p>
        <ul>
          <li>Harassing, hateful, threatening, or abusive</li>
          <li>Sexually explicit or graphic</li>
          <li>Violent or encouraging harm</li>
          <li>Illegal or promoting illegal activity</li>
          <li>Spam, scams, or misleading information</li>
          <li>False, defamatory, or intentionally deceptive</li>
        </ul>

        <h2>3. Honest Reviews Only</h2>
        <p>
          Reviews and comments must be based on real experiences. Do not post
          fake reviews, impersonate others, or intentionally misrepresent facts.
        </p>

        <h2>4. Reporting Content and Users</h2>
        <p>
          Users can report objectionable posts or abusive users directly inside
          the app using the Report feature. Reports may be reviewed by Rycus
          within 24 hours.
        </p>

        <h2>5. Blocking Users</h2>
        <p>
          Users can block other users. When blocked, users may be hidden from
          search results and feed content, and future interactions may be
          restricted.
        </p>

        <h2>6. Enforcement</h2>
        <p>
          Rycus may remove content, restrict features, suspend accounts, or
          permanently remove users who violate these guidelines.
        </p>

        <h2>7. Contact</h2>
        <p>
          For questions or safety concerns, contact:{" "}
          <strong>support@rycus.app</strong>
        </p>
      </div>
    </div>
  );
}
