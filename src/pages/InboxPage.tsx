// src/pages/InboxPage.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SquarePen } from "lucide-react";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

import AvatarWithBadge from "../components/AvatarWithBadge";
import rfBadge from "../assets/badges/rf-badge.png";

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
  profileImageUrl?: string | null;
  photoUrl?: string | null;
  pictureUrl?: string | null;
  imageUrl?: string | null;
  offersReferralFee?: boolean | null;
};

function safeDate(iso?: string | null): Date | null {
  if (!iso) return null;
  let s = String(iso).trim();
  if (!s) return null;
  s = s.replace(" ", "T");
  const hasTimezone = /Z$/i.test(s) || /[+-]\d{2}:\d{2}$/.test(s);
  const normalized = hasTimezone ? s : `${s}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function timeLabel(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function pickAvatarUrl(data?: UserMini | null): string | null {
  const url =
    data?.avatarUrl ||
    data?.profileImageUrl ||
    data?.photoUrl ||
    data?.pictureUrl ||
    data?.imageUrl ||
    "";

  const s = String(url || "").trim();
  return s ? s : null;
}

const InboxPage: React.FC = () => {
  const { user } = useAuth();

  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    void load();
  }, [user?.email]);

  useEffect(() => {
    const run = async () => {
      const missing = threads
        .map((t) => (t.otherEmail || "").trim())
        .filter((email) => email && !miniMap[email]);

      if (missing.length === 0) return;

      await Promise.all(
        missing.map(async (email) => {
          try {
            const res = await axios.get<UserMini>("/users/by-email", {
              params: { email },
            });

            setMiniMap((prev) => ({
              ...prev,
              [email]: res.data || {},
            }));
          } catch {
            setMiniMap((prev) => ({
              ...prev,
              [email]: { email },
            }));
          }
        })
      );
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads]);

  const hasThreads = threads.length > 0 && !loading && !error;

  return (
    <div className="page">
      <div className="inbox-container">
        <div className="inbox-header">
          <div>
            <h1>Inbox</h1>
            <p>
              Your private messages with other Rycus users. Click a conversation
              to open the chat.
            </p>
          </div>

          {/* ✅ Visible in web/desktop */}
          <Link
            to="/users"
            className="btn-secondary inbox-compose-top"
            aria-label="New message"
            title="New message"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            <SquarePen size={18} />
            <span>New message</span>
          </Link>
        </div>

        {loading && <div className="network-empty">Loading inbox…</div>}

        {!loading && error && (
          <div className="network-empty" style={{ color: "#b91c1c" }}>
            {error}
          </div>
        )}

        {!loading && !error && threads.length === 0 && (
          <div className="network-empty">
            No conversations yet. Go to <Link to="/users">Users</Link> and send
            a message.
          </div>
        )}

        {hasThreads && (
          <div className="inbox-list">
            {threads.map((t) => {
              const otherEmail = (t.otherEmail || "").trim();
              const mini = miniMap[otherEmail];

              const displayName = (
                mini?.fullName ||
                t.otherFullName ||
                otherEmail
              )
                .toString()
                .trim();

              const avatarUrl = pickAvatarUrl(mini);
              const showRF = !!mini?.offersReferralFee;

              const badge = t.unreadCount || 0;
              const dt = safeDate(t.lastMessageAt);
              const when = dt ? `${dateLabel(dt)} · ${timeLabel(dt)}` : "";

              return (
                <Link
                  key={otherEmail}
                  to={`/messages/${encodeURIComponent(otherEmail)}`}
                  className="inbox-card"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="inbox-card-left">
                    <AvatarWithBadge
                      size={42}
                      avatarUrl={avatarUrl}
                      name={displayName}
                      email={otherEmail}
                      showReferralBadge={showRF}
                      badgeSrc={rfBadge}
                    />

                    <div className="inbox-meta">
                      <div className="inbox-name">{displayName}</div>
                      <div className="inbox-snippet">{t.lastMessage || "—"}</div>
                      {when && <div className="inbox-date">{when}</div>}
                    </div>
                  </div>

                  <div className="inbox-actions">
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
                          fontWeight: 900,
                          fontSize: 12,
                          background: "#fff",
                          color: "#111827",
                        }}
                        title="Unread messages"
                      >
                        {badge}
                      </span>
                    )}

                    <span className="inbox-link">Open →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <Link to="/dashboard" className="inbox-back">
          ← Back to Dashboard
        </Link>

        {/* ✅ Floating button for mobile/app */}
        <Link
          to="/users"
          className="composeButton"
          aria-label="New message"
          title="New message"
        >
          <SquarePen size={24} />
        </Link>
      </div>
    </div>
  );
};

export default InboxPage;