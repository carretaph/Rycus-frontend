// src/pages/UserProfilePage.tsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "../api/axiosClient";

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
  totalReviews: number;
  averageRating: number;
  reviews: UserReview[];
};

const UserProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        const res = await axios.get<UserProfile>(`/users/${id}`);
        setUser(res.data);
      } catch (err) {
        console.error("Error loading user profile", err);
        setError("Could not load this user profile.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="page">
        <p>Loading user profile...</p>
      </div>
    );
  }

  if (error || !user) {
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
      <h1>{user.fullName}</h1>
      <p className="dashboard-text" style={{ maxWidth: 640 }}>
        {user.email}
      </p>

      <div className="dashboard-grid" style={{ marginTop: 24 }}>
        <div className="dashboard-card">
          <h2>Total Reviews</h2>
          <div className="dashboard-number">{user.totalReviews}</div>
          <p className="dashboard-text">
            Number of customer reviews written by this user.
          </p>
        </div>

        <div className="dashboard-card">
          <h2>Average Rating</h2>
          <div className="dashboard-number">
            {user.totalReviews > 0 ? user.averageRating.toFixed(1) : "0.0"}
          </div>
          <p className="dashboard-text">
            Average overall / payment rating of their reviews.
          </p>
        </div>
      </div>

      <h2 style={{ marginTop: 32 }}>Customer Reviews</h2>

      {user.reviews.length === 0 && (
        <p>This user hasn&apos;t written any reviews yet.</p>
      )}

      <div style={{ marginTop: 16 }}>
        {user.reviews.map((r) => (
          <div
            key={r.id}
            className="dashboard-card"
            style={{ marginBottom: 16 }}
          >
            <h3>
              Customer:{" "}
              {r.customerId ? (
                <Link to={`/customers/${r.customerId}/reviews`}>
                  {r.customerName}
                </Link>
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
