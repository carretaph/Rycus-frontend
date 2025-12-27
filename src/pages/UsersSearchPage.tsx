// src/pages/UsersSearchPage.tsx
import React, { useState } from "react";
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }

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
  };

  return (
    <div className="page">
      <h1>Search Users</h1>
      <p className="dashboard-text" style={{ maxWidth: 640 }}>
        Find other Rycus users and see how many customer reviews they&apos;ve
        submitted. In future versions you&apos;ll be able to open each user and
        see all the customers they have rated.
      </p>

      <form
        onSubmit={handleSearch}
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
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="Search by name or email..."
          className="input"
          style={{ maxWidth: 420, flex: "1 1 240px" }}
        />
        <button type="submit" className="dashboard-btn">
          Search
        </button>
      </form>

      {loading && <p>Searching users...</p>}

      {error && (
        <p style={{ color: "#b91c1c", marginBottom: 16 }}>
          {error}
        </p>
      )}

      {!loading && !error && results.length === 0 && touched && query.trim() && (
        <p>No users found for &quot;{query.trim()}&quot;.</p>
      )}

      {!loading && !error && !touched && (
        <p style={{ color: "#6b7280" }}>
          Type a name or email and click <strong>Search</strong> to find users.
        </p>
      )}

      <div className="dashboard-grid">
        {results.map((u) => (
          <div key={u.id} className="dashboard-card">
            <h2>{u.fullName}</h2>
            <p className="dashboard-text">{u.email}</p>
            <p className="dashboard-text">
              Reviews written:{" "}
              <strong>{u.totalReviews}</strong>
              <br />
              Average rating:{" "}
              <strong>
                {u.totalReviews > 0
                  ? u.averageRating.toFixed(1)
                  : "No reviews yet"}
              </strong>
            </p>

            {/* Por ahora solo dejamos esto como placeholder.
               Más adelante lo conectamos a /users/:id/reviews */}
            <span className="dashboard-link" style={{ opacity: 0.5 }}>
              User reviews (coming soon)
            </span>
          </div>
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
