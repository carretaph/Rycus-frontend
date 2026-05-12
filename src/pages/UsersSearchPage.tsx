// src/pages/UsersSearchPage.tsx

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

type UserSearchResult = {
  id: number;
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;

  offersReferralFee?: boolean;
  referralFeeType?: string | null;
  referralFeeValue?: number | null;
  referralFeeNotes?: string | null;
};

function initials(name?: string | null, email?: string | null) {
  const n = (name || "").trim();

  if (n) return n.charAt(0).toUpperCase();

  const e = (email || "").trim();

  if (e) return e.charAt(0).toUpperCase();

  return "?";
}

const UsersSearchPage: React.FC = () => {
  const { user } = useAuth();

  const [nameEmail, setNameEmail] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");

  const [results, setResults] = useState<UserSearchResult[]>([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const hasSearch =
    nameEmail.trim().length >= 2 ||
    industry.trim().length >= 2 ||
    location.trim().length >= 2;

  useEffect(() => {
    const run = async () => {
      if (!hasSearch) {
        setResults([]);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = await axios.get<UserSearchResult[]>(
          "/users/search-referrals/advanced",
          {
            params: {
              nameEmail,
              industry,
              location,
            },
          }
        );

        setResults(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error("advanced user search error", e);

        setResults([]);

        setError("Could not search users.");
      } finally {
        setLoading(false);
      }
    };

    const t = setTimeout(run, 350);

    return () => clearTimeout(t);
  }, [nameEmail, industry, location, hasSearch]);

  return (
    <div className="page">
      <div className="users-container">
        <div className="users-header">
          <div>
            <h1>Contractor Network</h1>

            <p>
              Search contractors, suppliers, service providers and sales reps
              across the Rycus network.
            </p>

            <div className="users-search-intro">
              <p>
                Search by name, industry, city or state and connect with other
                professionals in your market.
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

        {/* SEARCH BARS */}

        <div className="users-search-grid">
          <input
            className="users-search-input"
            value={nameEmail}
            onChange={(e) => setNameEmail(e.target.value)}
            placeholder="Search name or email..."
            autoComplete="off"
          />

          <input
            className="users-search-input"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Search industry..."
            autoComplete="off"
          />

          <input
            className="users-search-input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Search city or state..."
            autoComplete="off"
          />
        </div>

        {!hasSearch && (
          <div className="users-hint">
            Start typing to search the Rycus network.
          </div>
        )}

        {loading && <div className="users-hint">Searching…</div>}

        {error && <div className="users-error">{error}</div>}

        {!loading && !error && hasSearch && results.length === 0 && (
          <div className="users-hint">No users found.</div>
        )}

        <div className="users-results">
          {results.map((u) => {
            const fullName = (u.fullName || "").trim();

            const email = (u.email || "").trim();

            const avatarUrl = (u.avatarUrl || "").trim();

            return (
              <div key={u.id} className="users-card">
                <div className="users-card-left">
                  <div className="users-avatar">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={fullName || email || "avatar"}
                      />
                    ) : (
                      <span>{initials(fullName, email)}</span>
                    )}
                  </div>

                  <div className="users-meta">
                    <div className="users-name">
                      {fullName || "Unknown User"}
                    </div>

                    <div className="users-email">{email || "—"}</div>

                    {/* REFERRAL */}

                    {u.offersReferralFee && (
                      <div className="users-referral-box">
                        💰 Referral Fee Available

                        {u.referralFeeValue != null && (
                          <div className="users-referral-amount">
                            {u.referralFeeType === "PERCENT"
                              ? `${u.referralFeeValue}%`
                              : `$${u.referralFeeValue}`}
                          </div>
                        )}

                        {u.referralFeeNotes && (
                          <div className="users-referral-notes">
                            {u.referralFeeNotes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="users-actions">
                  <Link
                    to={`/users/${u.id}`}
                    className="btn-secondary"
                  >
                    View profile →
                  </Link>

                  {user?.email && email && (
                    <Link
                      to={`/messages/${encodeURIComponent(email)}`}
                      className="btn-secondary"
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