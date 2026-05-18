import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

import AvatarWithBadge from "../components/AvatarWithBadge";
import rfBadge from "../assets/badges/rf-badge.png";

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
  offersReferralFee?: boolean | null;
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

type UserPhoto = {
  postId: number;
  imageUrl: string;
  createdAt: string | null;
};

const normalizePhoneForTel = (raw?: string | null) => {
  if (!raw) return "";
  return raw.replace(/[^\d+]/g, "");
};

const UserProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sendingRequest, setSendingRequest] = useState(false);
  const [isAlreadyConnected, setIsAlreadyConnected] = useState(false);

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

        const profileRes = await axios.get<UserProfile>(`/users/${id}`);
        const data = profileRes.data as any;

        setProfile({
          ...data,
          reviews: Array.isArray(data.reviews) ? data.reviews : [],
          totalReviews: Number(data.totalReviews ?? 0),
          averageRating: Number(data.averageRating ?? 0),
        });

        try {
          const photosRes = await axios.get<UserPhoto[]>(`/users/${id}/photos`);
          setPhotos(Array.isArray(photosRes.data) ? photosRes.data : []);
        } catch (photoErr) {
          console.warn("Photos endpoint unavailable", photoErr);
          setPhotos([]);
        }
      } catch (err) {
        console.error("Error loading user profile", err);
        setError("Could not load this user profile.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

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

    void checkConnection();
  }, [currentUser?.email, currentUser?.id, profile]);

  const handleAddToNetwork = async () => {
    if (!profile) return;

    if (!currentUser) {
      alert("You must be logged in.");
      return;
    }

    if (currentUser.id === profile.id) {
      alert("You cannot add yourself.");
      return;
    }

    try {
      setSendingRequest(true);

      await axios.post("/connections/request", {
        fromEmail: currentUser.email,
        toEmail: profile.email,
      });

      alert("Connection request sent!");
    } catch (err: any) {
      console.error(err);
      alert("Could not send request.");
    } finally {
      setSendingRequest(false);
    }
  };

  const isMe = currentUser?.id === profile?.id;
  const isLoggedIn = !!currentUser;
  const showAddToNetwork = isLoggedIn && !isMe && !isAlreadyConnected;

  const phone = (profile?.phone ?? "").trim();
  const tel = normalizePhoneForTel(phone);

  const industry = (profile?.industry ?? "").trim();
  const businessName = (profile?.businessName ?? "").trim();
  const city = (profile?.city ?? "").trim();
  const state = (profile?.state ?? "").trim();

  const location = [city, state].filter(Boolean).join(", ");
  const reviews = profile?.reviews ?? [];
  const showRF = !!profile?.offersReferralFee;
  const isOwner = (currentUser as any)?.email === "carretaph@gmail.com";

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
          <p className="users-error">{error}</p>

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
        <div className="userprofile-header-card">
          <div className="userprofile-header">
            <div className="userprofile-avatar-wrap">
              <AvatarWithBadge
                size={96}
                avatarUrl={profile.avatarUrl || null}
                name={profile.fullName}
                email={profile.email}
                showReferralBadge={showRF}
                badgeSrc={rfBadge}
              />
            </div>

            <div className="userprofile-main">
              <h1 className="userprofile-name">{profile.fullName}</h1>

              <div className="userprofile-email">{profile.email}</div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  justifyContent: "center",
                  marginTop: 10,
                  marginBottom: 14,
                }}
              >
                {industry && (
                  <span className="userprofile-chip">
                    🛠️ {industry}
                  </span>
                )}

                {businessName && (
                  <span className="userprofile-chip">
                    🏢 {businessName}
                  </span>
                )}

                {location && (
                  <span className="userprofile-chip">
                    📍 {location}
                  </span>
                )}

                {tel && (
                  <a
                    className="userprofile-chip userprofile-chip-link"
                    href={`tel:${tel}`}
                  >
                    📞 {phone}
                  </a>
                )}
              </div>

              {isMe && (
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    justifyContent: "center",
                    flexWrap: "nowrap",
                    marginTop: 2,
                    marginBottom: 0,
                  }}
                >
                  <span
                    className="userprofile-pill"
                    style={{
                      margin: 0,
                      whiteSpace: "nowrap",
                      height: 42,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 14px",
                    }}
                  >
                    You
                  </span>

                  <Link
                    to="/profile"
                    className="btn-primary"
                    style={{
                      minWidth: 78,
                      width: 78,
                      height: 42,
                      padding: 0,
                      borderRadius: 999,
                      textAlign: "center",
                      textDecoration: "none",
                      fontSize: 14,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1,
                    }}
                  >
                    Edit
                  </Link>

                  {isOwner && (
                    <Link
                      to="/admin"
                      className="btn-secondary"
                      style={{
                        minWidth: 78,
                        width: 78,
                        height: 42,
                        padding: 0,
                        borderRadius: 999,
                        textAlign: "center",
                        textDecoration: "none",
                        fontSize: 14,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: 1,
                      }}
                    >
                      Admin
                    </Link>
                  )}
                </div>
              )}

              {!isMe && showAddToNetwork && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: 16,
                  }}
                >
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleAddToNetwork}
                    disabled={sendingRequest}
                  >
                    {sendingRequest
                      ? "Sending..."
                      : "+ Add to My Network"}
                  </button>
                </div>
              )}

              {!isMe && isAlreadyConnected && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: 16,
                  }}
                >
                  <span className="userprofile-pill">
                    Connected
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="userprofile-stats">
          <div className="dashboard-card">
            <h2>Total Reviews</h2>

            <div className="dashboard-number">
              {profile.totalReviews}
            </div>

            <p className="dashboard-text">
              Number of customer reviews written by this user.
            </p>
          </div>

          <div className="dashboard-card">
            <h2>Average Rating</h2>

            <div className="dashboard-number">
              {profile.totalReviews > 0
                ? profile.averageRating.toFixed(1)
                : "0.0"}
            </div>

            <p className="dashboard-text">
              Average overall rating.
            </p>
          </div>
        </div>

        <div className="userprofile-section">
          <h2 className="userprofile-section-title">
            Photo Grid
          </h2>

          {photos.length === 0 ? (
            <p className="dashboard-text">
              No photos posted yet.
            </p>
          ) : (
            <div className="userprofile-photo-grid">
              {photos.map((photo, index) => (
                <a
                  key={`${photo.postId}-${index}`}
                  href={photo.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="userprofile-photo-item"
                >
                  <img
                    src={photo.imageUrl}
                    alt="Post"
                    className="userprofile-photo"
                  />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="userprofile-section">
          <h2 className="userprofile-section-title">
            Customer Reviews
          </h2>

          {reviews.length === 0 && (
            <p className="dashboard-text">
              This user hasn&apos;t written any reviews yet.
            </p>
          )}

          <div className="userprofile-reviews">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="dashboard-card userprofile-review-card"
              >
                <h3 className="userprofile-review-title">
                  Customer:{" "}
                  {r.customerId ? (
                    <Link to={`/customers/${r.customerId}`}>
                      {r.customerName}
                    </Link>
                  ) : (
                    r.customerName
                  )}
                </h3>

                <p className="dashboard-text">
                  Overall:{" "}
                  <strong>{r.ratingOverall ?? "-"}</strong>
                </p>

                {r.comment && (
                  <p className="dashboard-text">{r.comment}</p>
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