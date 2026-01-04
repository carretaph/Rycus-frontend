// src/pages/UserProfilePage.tsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

type UserReview = {
  id: number;
  customerId: number | null;
  customerName: string;
  ratingOverall: number | null;
  ratingPayment: number | null;
  ratingBehavior: number | null;
  ratingCommunication: number | null;
  comment: string | null;
  createdAt: string | null;
};

type UserProfile = {
  id: number;
  fullName: string;
  email: string;

  // ✅ NUEVOS CAMPOS PÚBLICOS
  phone?: string | null;
  businessName?: string | null;
  industry?: string | null;
  city?: string | null;
  state?: string | null;
  avatarUrl?: string | null;

  totalReviews: number;
  averageRating: number;
  reviews: UserReview[];
};

type ConnectionDto = {
  id: number;
  requesterEmail: string;
  receiverEmail: string;
  status: string;
};

const normalizePhoneForTel = (raw?: string | null) => {
  if (!raw) return "";
  // deja solo números y +
  const cleaned = raw.replace(/[^\d+]/g, "");
  return cleaned;
};

const UserProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [isAlreadyConnected, setIsAlreadyConnected] = useState(false);

  // ================================
  // Cargar perfil de usuario
  // ================================
  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError("User ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = await axios.get<UserProfile>(`/users/${id}`);
        setProfile(res.data);
      } catch (err) {
        console.error("Error loading user profile", err);
        setError("Could not load this user profile.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  // ================================
  // Comprobar si ya somos contactos
  // ================================
  useEffect(() => {
    const checkConnection = async () => {
      if (!currentUser?.email || !profile) {
        setIsAlreadyConnected(false);
        return;
      }

      if (currentUser.id === profile.id) {
        setIsAlreadyConnected(false);
        return;
      }

      try {
        const res = await axios.get<ConnectionDto[]>("/connections/my", {
          params: { email: currentUser.email },
        });

        const myEmail = currentUser.email.toLowerCase();
        const targetEmail = profile.email.toLowerCase();

        const found = (res.data ?? []).some((c) => {
          const requester = c.requesterEmail.toLowerCase();
          const receiver = c.receiverEmail.toLowerCase();

          return (
            c.status === "ACCEPTED" &&
            ((requester === myEmail && receiver === targetEmail) ||
              (requester === targetEmail && receiver === myEmail))
          );
        });

        setIsAlreadyConnected(found);
      } catch (err) {
        console.error("Error checking connection", err);
        setIsAlreadyConnected(false);
      }
    };

    checkConnection();
  }, [currentUser?.email, profile]);

  // ================================
  // Enviar solicitud de conexión
  // ================================
  const handleAddToNetwork = async () => {
    if (!profile) return;

    if (!currentUser) {
      alert("You must be logged in to send a connection request.");
      return;
    }

    if (!currentUser.email) {
      alert("We could not find your email. Please log out and log in again.");
      return;
    }

    if (currentUser.id === profile.id) {
      alert("You cannot add yourself to your own network.");
      return;
    }

    try {
      setSendingRequest(true);

      const body = {
        fromEmail: currentUser.email,
        toEmail: profile.email,
      };

      const res = await axios.post("/connections/request", body);
      console.log("Connection request OK:", res.data);
      alert("Connection request sent!");
    } catch (err: any) {
      console.error("Error sending connection request", err);
      const status = err?.response?.status;
      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;

      if (status) {
        alert(`Error ${status}: ${backendMessage || "Could not send request."}`);
      } else {
        alert("Could not send connection request (network error).");
      }
    } finally {
      setSendingRequest(false);
    }
  };

  // ================================
  // Helpers UI
  // ================================
  const isMe = currentUser?.id === profile?.id;
  const isLoggedIn = !!currentUser;

  const avatarInitial = (() => {
    if (profile?.fullName?.trim()) return profile.fullName.trim().charAt(0).toUpperCase();
    if (profile?.email?.trim()) return profile.email.trim().charAt(0).toUpperCase();
    return "U";
  })();

  const showAddToNetwork = isLoggedIn && !isMe && !isAlreadyConnected;

  const phone = (profile?.phone ?? "").trim();
  const tel = normalizePhoneForTel(phone);

  const industry = (profile?.industry ?? "").trim();
  const businessName = (profile?.businessName ?? "").trim();
  const city = (profile?.city ?? "").trim();
  const state = (profile?.state ?? "").trim();
  const location = [city, state].filter(Boolean).join(", ");

  // ================================
  // Render
  // ================================
  if (loading) {
    return (
      <div className="page">
        <p>Loading user profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page">
        <p style={{ color: "#b91c1c" }}>{error || "User not found."}</p>
        <Link to="/users" className="dashboard-link">
          ← Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Cabecera */}
      <div className="dashboard-card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div className="profile-photo-wrapper">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.fullName}
                className="profile-photo-img"
                style={{ width: 86, height: 86, borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <div
                className="profile-photo-placeholder"
                style={{ width: 86, height: 86, borderRadius: "50%", display: "grid", placeItems: "center" }}
              >
                {avatarInitial}
              </div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <h1 className="card-title" style={{ marginBottom: 4 }}>
              {profile.fullName}
            </h1>
            <div className="dashboard-text" style={{ marginBottom: 8 }}>
              {profile.email}
            </div>

            {/* Chips */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {industry && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #e5e7eb",
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  🛠️ {industry}
                </span>
              )}

              {businessName && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #e5e7eb",
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  🏢 {businessName}
                </span>
              )}

              {location && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #e5e7eb",
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  📍 {location}
                </span>
              )}

              {tel && (
                <a
                  href={`tel:${tel}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #e5e7eb",
                    fontWeight: 800,
                    fontSize: 12,
                    textDecoration: "none",
                  }}
                >
                  📞 {phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Botón Add to Network */}
      {showAddToNetwork && (
        <div style={{ marginTop: 4, marginBottom: 16 }}>
          <button
            type="button"
            className="dashboard-btn"
            onClick={handleAddToNetwork}
            disabled={sendingRequest}
          >
            {sendingRequest ? "Sending..." : "+ Add to My Network"}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="dashboard-grid" style={{ marginTop: 8 }}>
        <div className="dashboard-card">
          <h2>Total Reviews</h2>
          <div className="dashboard-number">{profile.totalReviews}</div>
          <p className="dashboard-text">
            Number of customer reviews written by this user.
          </p>
        </div>

        <div className="dashboard-card">
          <h2>Average Rating</h2>
          <div className="dashboard-number">
            {profile.totalReviews > 0 ? profile.averageRating.toFixed(1) : "0.0"}
          </div>
          <p className="dashboard-text">
            Average overall / payment rating of their reviews.
          </p>
        </div>
      </div>

      {/* Reviews */}
      <h2 style={{ marginTop: 32 }}>Customer Reviews</h2>

      {profile.reviews.length === 0 && (
        <p>This user hasn&apos;t written any reviews yet.</p>
      )}

      <div style={{ marginTop: 16 }}>
        {profile.reviews.map((r) => (
          <div key={r.id} className="dashboard-card" style={{ marginBottom: 16 }}>
            <h3>
              Customer:{" "}
              {r.customerId ? (
                // ✅ tu ruta real en App.tsx es /customers/:id (NO /reviews)
                <Link to={`/customers/${r.customerId}`}>{r.customerName}</Link>
              ) : (
                r.customerName
              )}
            </h3>

            <p className="dashboard-text">
              Overall: <strong>{r.ratingOverall ?? "-"}</strong> · Payment:{" "}
              <strong>{r.ratingPayment ?? "-"}</strong> · Behavior:{" "}
              <strong>{r.ratingBehavior ?? "-"}</strong> · Communication:{" "}
              <strong>{r.ratingCommunication ?? "-"}</strong>
            </p>

            {r.comment && <p className="dashboard-text">{r.comment}</p>}

            {r.createdAt && (
              <p className="dashboard-text" style={{ fontSize: "0.8rem" }}>
                {r.createdAt}
              </p>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32 }}>
        <Link to="/users" className="dashboard-link">
          ← Back to Users
        </Link>
      </div>
    </div>
  );
};

export default UserProfilePage;
