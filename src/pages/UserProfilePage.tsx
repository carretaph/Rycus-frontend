// src/pages/UserProfilePage.tsx
import React, { useEffect, useMemo, useState } from "react";
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
  return raw.replace(/[^\d+]/g, "");
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
  // Load profile
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
  // Check connection
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
  // Actions
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
  // Computed UI values
  // ================================
  const isMe = currentUser?.id === profile?.id;
  const isLoggedIn = !!currentUser;
  const showAddToNetwork = isLoggedIn && !isMe && !isAlreadyConnected;

  const avatarInitial = useMemo(() => {
    if (profile?.fullName?.trim())
      return profile.fullName.trim().charAt(0).toUpperCase();
    if (profile?.email?.trim()) return profile.email.trim().charAt(0).toUpperCase();
    return "U";
  }, [profile?.fullName, profile?.email]);

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
        <div className="userprofile-container">
          <p>Loading user profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page">
        <div className="userprofile-container">
          <p className="users-error">{error || "User not found."}</p>
          <Link to="/users" className="dashboard-link">
            ← Back to Users
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="userprofile-container">
        {/* HEADER CARD */}
        <div className="userprofile-header-card">
          <div className="userprofile-header">
            <div className="userprofile-avatar">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.fullName} />
              ) : (
                <span>{avatarInitial}</span>
              )}
            </div>

            <div className="userprofile-main">
              <h1 className="userprofile-name">{profile.fullName}</h1>
              <div className="userprofile-email">{profile.email}</div>

              <div className="userprofile-chips">
                {industry && <span className="userprofile-chip">🛠️ {industry}</span>}
                {businessName && (
                  <span className="userprofile-chip">🏢 {businessName}</span>
                )}
                {location && <span className="userprofile-chip">📍 {location}</span>}
                {tel && (
                  <a className="userprofile-chip userprofile-chip-link" href={`tel:${tel}`}>
                    📞 {phone}
                  </a>
                )}
              </div>
            </div>

            <div className="userprofile-actions">
              {showAddToNetwork ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleAddToNetwork}
                  disabled={sendingRequest}
                >
                  {sendingRequest ? "Sending..." : "+ Add to My Network"}
                </button>
              ) : isMe ? (
                <span className="userprofile-pill">This is you</span>
              ) : isAlreadyConnected ? (
                <span className="userprofile-pill">Connected</span>
              ) : (
                <span className="userprofile-pill">View only</span>
              )}
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="userprofile-stats">
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

        {/* REVIEWS */}
        <div className="userprofile-section">
          <h2 className="userprofile-section-title">Customer Reviews</h2>

          {profile.reviews.length === 0 && (
            <p className="dashboard-text">This user hasn&apos;t written any reviews yet.</p>
          )}

          <div className="userprofile-reviews">
            {profile.reviews.map((r) => (
              <div key={r.id} className="dashboard-card userprofile-review-card">
                <h3 className="userprofile-review-title">
                  Customer:{" "}
                  {r.customerId ? (
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
                  <p className="dashboard-text userprofile-review-date">{r.createdAt}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="userprofile-footer">
          <Link to="/users" className="dashboard-link">
            ← Back to Users
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
