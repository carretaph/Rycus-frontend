// src/pages/InboxPage.tsx
import React, { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

type InboxThread = {
  otherEmail: string;
  otherFullName: string | null;

  lastMessage: string | null;
  lastMessageAt: string | null;

  unreadCount: number;
};

const InboxPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userEmail = user?.email?.trim();
      if (!userEmail) {
        setThreads([]);
        return;
      }

      const res = await axios.get<InboxThread[]>("/messages/inbox", {
        params: { userEmail },
      });

      setThreads(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Error loading inbox", e);
      setError("Could not load inbox. Please try again.");
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // ✅ carga normal
  useEffect(() => {
    void load();
  }, [load]);

  // ✅ si vienes desde Messages con state.refresh => fuerza reload
  useEffect(() => {
    const state = location.state as any;
    if (state?.refresh) {
      void load();
    }
  }, [location.state, load]);

  return (
    <div className="page">
      <h1>Inbox</h1>

      <p className="dashboard-text" style={{ maxWidth: 720 }}>
        Your private messages with other Rycus users. Click a conversation to
        open the chat.
      </p>

      {loading && <p>Loading inbox...</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {!loading && !error && threads.length === 0 && (
        <p style={{ color: "#6b7280" }}>
          No conversations yet. Go to <Link to="/users">Users</Link> and send a
          message.
        </p>
      )}

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {threads.map((t) => {
          const displayName = (t.otherFullName || t.otherEmail).trim();
          const badge = t.unreadCount || 0;

          return (
            <Link
              key={t.otherEmail}
              to={`/messages/${encodeURIComponent(t.otherEmail)}`}
              className="dashboard-card"
              style={{
                textDecoration: "none",
                color: "inherit",
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>
                    {displayName}
                  </div>

                  <div
                    style={{
                      color: "#6b7280",
                      fontSize: 14,
                      marginTop: 4,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: 680,
                    }}
                  >
                    {t.lastMessage || "—"}
                  </div>

                  {/* ✅ fecha + hora */}
                  {t.lastMessageAt && (
                    <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 6 }}>
                      {new Date(t.lastMessageAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {badge > 0 && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 22,
                        height: 22,
                        padding: "0 7px",
                        borderRadius: 999,
                        border: "1px solid #e5e7eb",
                        fontWeight: 800,
                        fontSize: 12,
                      }}
                    >
                      {badge}
                    </span>
                  )}
                  <span className="dashboard-link">Open →</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div style={{ marginTop: 28 }}>
        <Link to="/dashboard" className="dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default InboxPage;
