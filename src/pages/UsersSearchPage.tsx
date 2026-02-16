// src/pages/UsersSearchPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

type UserSummary = {
  id: number;
  fullName?: string | null;
  email?: string | null;
};

type UserProfile = {
  id: number;
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  totalReviews?: number;
  averageRating?: number;
};

function initials(name?: string | null, email?: string | null) {
  const n = (name || "").trim();
  if (n) return n.charAt(0).toUpperCase();
  const e = (email || "").trim();
  if (e) return e.charAt(0).toUpperCase();
  return "?";
}

function formatAvg(avg?: number | null) {
  if (avg == null) return "—";
  const n = Number(avg);
  if (Number.isNaN(n)) return "—";
  return n.toFixed(1);
}

const UsersSearchPage: React.FC = () => {
  const { user } = useAuth();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // cache user profile mini (para mostrar avatar + reviews)
  const [profileMap, setProfileMap] = useState<Record<number, UserProfile>>({});

  const q = useMemo(() => query.trim(), [query]);
  const canSearch = q.length >= 2;

  useEffect(() => {
    const run = async () => {
      if (!canSearch) {
        setResults([]);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = await axios.get<UserSummary[]>("/users/search", {
          params: { query: q },
        });

        setResults(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error("search users error", e);
        setResults([]);
        setError("Could not search users. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    const t = setTimeout(run, 250);
    return () => clearTimeout(t);
  }, [q, canSearch]);

  // cargar perfiles (avatar + stats) para resultados, caché por id
  useEffect(() => {
    const loadProfiles = async () => {
      const missingIds = results
        .map((r) => r.id)
        .filter((id) => typeof id === "number" && !profileMap[id]);

      for (const id of missingIds) {
        try {
          const res = await axios.get<UserProfile>(`/users/${id}`);
          setProfileMap((prev) => ({ ...prev, [id]: res.data }));
        } catch {
          // si falla, al menos cacheamos algo mínimo para no reintentar infinito
          const fallback: UserProfile = {
            id,
            fullName: results.find((x) => x.id === id)?.fullName || null,
            email: results.find((x) => x.id === id)?.email || null,
          };
          setProfileMap((prev) => ({ ...prev, [id]: fallback }));
        }
      }
    };

    void loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  return (
    <div className="page">
      <div className="users-container">
        <div className="users-header">
          <div>
            <h1>Search Users</h1>
            <p>
              Find other Rycus users and see how many customer reviews they've
              submitted. Type at least <b>2 letters</b> to start searching
              automatically.
            </p>

            {/* ✅ NUEVO BLOQUE (la opción 2) */}
            <div className="users-search-intro">
              <p>
                <strong>
                  Did you know you can search and connect with other contractors
                  and service providers on Rycus?
                </strong>
              </p>

              <p>
                Start with a name or email — and soon you’ll be able to filter
                by industry, city, and even find users who offer{" "}
                <strong>Referral Fees</strong> for new customers.
              </p>

              <p className="users-search-tagline">
                Grow your network. Send business. Get paid.
              </p>
            </div>
          </div>

          <div className="users-top-actions">
            <Link to="/dashboard" className="dashboard-link">
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="users-search-row">
          <input
            className="users-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email..."
            autoComplete="off"
          />
        </div>

        {!canSearch && (
          <div className="users-hint">Start typing a name or email to find users.</div>
        )}

        {loading && <div className="users-hint">Searching…</div>}
        {error && <div className="users-error">{error}</div>}

        {!loading && !error && canSearch && results.length === 0 && (
          <div className="users-hint">No users found.</div>
        )}

        <div className="users-results">
          {results.map((r) => {
            const prof = profileMap[r.id];
            const fullName = (prof?.fullName ?? r.fullName ?? "")
              .toString()
              .trim();
            const email = (prof?.email ?? r.email ?? "").toString().trim();
            const avatarUrl = (prof?.avatarUrl ?? "").toString().trim() || null;

            const reviews = prof?.totalReviews ?? 0;
            const avg = prof?.averageRating ?? null;

            return (
              <div key={r.id} className="users-card">
                <div className="users-card-left">
                  <div className="users-avatar" title={fullName || email || ""}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={fullName || email || "avatar"} />
                    ) : (
                      <span>{initials(fullName, email)}</span>
                    )}
                  </div>

                  <div className="users-meta">
                    <div className="users-name">{fullName || "Unknown"}</div>
                    <div className="users-email">{email || "—"}</div>

                    <div className="users-stats">
                      <div>
                        <span className="users-stat-label">Reviews written:</span>{" "}
                        <b>{reviews}</b>
                      </div>
                      <div>
                        <span className="users-stat-label">Average rating:</span>{" "}
                        <b>{reviews > 0 ? formatAvg(avg) : "No reviews yet"}</b>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="users-actions">
                  <Link to={`/users/${r.id}`} className="btn-secondary">
                    View profile →
                  </Link>

                  {/* message sólo si hay sesión */}
                  {user?.email && email && (
                    <Link
                      to={`/messages/${encodeURIComponent(email)}`}
                      className="btn-secondary"
                      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                    >
                      💬 Message
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 18 }}>
          <Link to="/dashboard" className="dashboard-link">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UsersSearchPage;
