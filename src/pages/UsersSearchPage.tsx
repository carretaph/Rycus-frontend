// src/pages/UsersSearchPage.tsx
import React, { useEffect, useState } from "react";
import axios from "../api/axiosClient";
import { Link } from "react-router-dom";

type UserSummary = {
  id: number;
  fullName: string;
  email: string;
  totalReviews: number;
  averageRating: number;
};

const UsersSearchPage: React.FC = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  // ================================
  // 🔍 AUTO SEARCH (debounce)
  // ================================
  useEffect(() => {
    const q = query.trim();

    if (!q || q.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await axios.get<UserSummary[]>("/users/search", {
          params: { q },
        });

        setResults(res.data || []);
      } catch (err) {
        console.error("Error searching users", err);
        setError("There was an error searching users. Please try again.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // debounce

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="page">
      <h1>Search Users</h1>

      <p className="dashboard-text" style={{ maxWidth: 640 }}>
        Find other Rycus users and see how many customer reviews they've submitted.
        Type at least <strong>2 letters</strong> to start searching automatically.
      </p>

      <div
        style={{
          marginTop: 16,
          marginBottom: 24,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setTouched(true);
            setQuery(e.target.value);
          }}
          placeholder="Search by name or email..."
          className="input"
          style={{ maxWidth: 420, flex: "1 1 240px" }}
        />
      </div>

      {loading && <p>Searching users...</p>}

      {error && (
        <p style={{ color: "#b91c1c", marginBottom: 16 }}>{error}</p>
      )}

      {!loading &&
        !error &&
        results.length === 0 &&
        touched &&
        query.trim().length >= 2 && (
          <p>No users found for "{query.trim()}".</p>
        )}

      {!loading && !error && !touched && (
        <p style={{ color: "#6b7280" }}>
          Start typing a name or email to find users.
        </p>
      )}

      {/* ================================
          RESULT CARDS
      ================================= */}
      <div className="dashboard-grid">
        {results.map((u) => (
          <Link
            key={u.id}
            to={`/users/${u.id}`}
            className="dashboard-card"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <h2>{u.fullName}</h2>
            <p className="dashboard-text">{u.email}</p>

            <p className="dashboard-text">
              Reviews written: <strong>{u.totalReviews}</strong>
              <br />
              Average rating:{" "}
              <strong>
                {u.totalReviews > 0
                  ? u.averageRating.toFixed(1)
                  : "No reviews yet"}
              </strong>
            </p>

            <span className="dashboard-link">View user profile →</span>
          </Link>
        ))}
      </div>

      <div style={{ marginTop: 32 }}>
        <Link to="/dashboard" className="dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default UsersSearchPage;
