// src/pages/InboxPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

type InboxThread = {
  otherEmail: string;
  otherFullName: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

type UserMini = {
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
};

function safeDate(iso?: string | null): Date | null {
  if (!iso) return null;
  let s = String(iso).trim();
  if (!s) return null;
  s = s.replace(" ", "T");
  const hasTimezone = /Z$/i.test(s) || /[+-]\d{2}:\d{2}$/.test(s);
  const normalized = hasTimezone ? s : `${s}Z`;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function timeLabel(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function dateLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function initialFromEmailOrName(name?: string | null, email?: string | null) {
  const n = (name || "").trim();
  if (n) return n.charAt(0).toUpperCase();
  const e = (email || "").trim();
  if (e) return e.charAt(0).toUpperCase();
  return "?";
}

const AvatarBubble: React.FC<{
  size?: number;
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;
}> = ({ size = 34, avatarUrl, name, email }) => {
  const initial = initialFromEmailOrName(name, email);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        border: "1px solid #e5e7eb",
        background: "#f3f4f6",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
      }}
      title={(name || email || "").toString()}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={(name || email || "avatar").toString()}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span style={{ fontWeight: 800, fontSize: 13, color: "#111827" }}>{initial}</span>
      )}
    </div>
  );
};

const InboxPage: React.FC = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // cache: otherEmail -> {fullName, avatarUrl}
  const [miniMap, setMiniMap] = useState<Record<string, UserMini>>({});

  useEffect(() => {
    const load = async () => {
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

        const list = Array.isArray(res.data) ? res.data : [];
        setThreads(list);
      } catch (e) {
        console.error("Error loading inbox", e);
        setError("Could not load inbox. Please try again.");
        setThreads([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.email]);

  // load mini info for each thread (cached)
  useEffect(() => {
    const run = async () => {
      const missing = threads
        .map((t) => (t.otherEmail || "").trim())
        .filter((e) => e && !miniMap[e]);

      if (missing.length === 0) return;

      // fetch sequential (simple + stable); can optimize later
      for (const email of missing) {
        try {
          const res = await axios.get<UserMini>("/users/by-email", { params: { email } });
          setMiniMap((prev) => ({ ...prev, [email]: res.data || {} }));
        } catch {
          // ignore
          setMiniMap((prev) => ({ ...prev, [email]: { email } }));
        }
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads]);

  const hasThreads = threads.length > 0 && !loading && !error;

  return (
    <div className="page">
      <h1>Inbox</h1>

      <p className="dashboard-text" style={{ maxWidth: 720 }}>
        Your private messages with other Rycus users. Click a conversation to open the chat.
      </p>

      {loading && <p>Loading inbox...</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {!loading && !error && threads.length === 0 && (
        <p style={{ color: "#6b7280" }}>
          No conversations yet. Go to <Link to="/users">Users</Link> and send a message.
        </p>
      )}

      {hasThreads && (
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {threads.map((t) => {
            const otherEmail = (t.otherEmail || "").trim();
            const mini = miniMap[otherEmail];

            const displayName = (mini?.fullName || t.otherFullName || otherEmail).toString().trim();
            const avatarUrl = (mini?.avatarUrl || "").toString().trim() || null;

            const badge = t.unreadCount || 0;
            const dt = safeDate(t.lastMessageAt);
            const when = dt ? `${dateLabel(dt)} · ${timeLabel(dt)}` : "";

            return (
              <Link
                key={t.otherEmail}
                to={`/messages/${encodeURIComponent(otherEmail)}`}
                className="dashboard-card"
                style={{ textDecoration: "none", color: "inherit", padding: 16 }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <AvatarBubble avatarUrl={avatarUrl} name={displayName} email={otherEmail} />

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{displayName}</div>

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

                    {when && (
                      <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 6 }}>
                        {when}
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
      )}

      <div style={{ marginTop: 28 }}>
        <Link to="/dashboard" className="dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default InboxPage;
