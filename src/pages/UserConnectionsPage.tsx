// src/pages/UserConnectionsPage.tsx
import React, { useEffect, useState } from "react";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import AvatarWithBadge from "../components/AvatarWithBadge";

type Connection = {
  id: number;
  requesterId: number;
  requesterName: string;
  requesterEmail: string;
  receiverId: number;
  receiverName: string;
  receiverEmail: string;
  status: string;
  createdAt: string | null;
};

// ✅ mini profile (lo que necesitamos para avatar + badge)
type UserProfileMini = {
  id?: number | null;
  email?: string | null;
  fullName?: string | null;

  avatarUrl?: string | null;
  profileImageUrl?: string | null;
  photoUrl?: string | null;
  pictureUrl?: string | null;
  imageUrl?: string | null;

  offersReferralFee?: boolean | null;
  referralFeeType?: "FLAT" | "PERCENT" | null;
  referralFeeValue?: number | null;
  referralFeeNotes?: string | null;
};

const UserConnectionsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [myConnections, setMyConnections] = useState<Connection[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // ✅ cache por email: { email -> mini }
  const [miniByEmail, setMiniByEmail] = useState<Record<string, UserProfileMini>>(
    {}
  );

  const refreshBadgesNow = () => {
    window.dispatchEvent(new Event("rycus:refresh-badges"));
  };

  // ---- helpers "other user" ----
  const getOtherName = (c: Connection): string => {
    if (!currentUser?.email) return `${c.requesterName} ↔ ${c.receiverName}`;

    if (c.requesterEmail.toLowerCase() === currentUser.email.toLowerCase()) {
      return c.receiverName || c.receiverEmail;
    }
    return c.requesterName || c.requesterEmail;
  };

  const getOtherEmail = (c: Connection): string => {
    if (!currentUser?.email) return `${c.requesterEmail} / ${c.receiverEmail}`;

    if (c.requesterEmail.toLowerCase() === currentUser.email.toLowerCase()) {
      return c.receiverEmail;
    }
    return c.requesterEmail;
  };

  const getAvatarInitial = (c: Connection): string => {
    const name = getOtherName(c);
    if (name?.trim()) return name.trim().charAt(0).toUpperCase();

    const email = getOtherEmail(c);
    if (email?.trim()) return email.trim().charAt(0).toUpperCase();

    return "U";
  };

  const getOtherId = (c: Connection): number => {
    if (!currentUser?.email) return c.receiverId;

    if (c.requesterEmail.toLowerCase() === currentUser.email.toLowerCase()) {
      return c.receiverId;
    }
    return c.requesterId;
  };

  const pickAvatarUrl = (data?: UserProfileMini | null): string | null => {
    const url =
      data?.avatarUrl ||
      data?.profileImageUrl ||
      data?.photoUrl ||
      data?.pictureUrl ||
      data?.imageUrl ||
      "";

    const s = String(url || "").trim();
    return s ? s : null;
  };

  // ✅ carga mini profiles por email (incluye offersReferralFee)
  const loadMiniForEmails = async (emails: string[]) => {
    const unique = Array.from(
      new Set(
        emails
          .map((e) => String(e || "").trim().toLowerCase())
          .filter(Boolean)
      )
    );

    const missing = unique.filter((email) => !miniByEmail[email]);
    if (missing.length === 0) return;

    await Promise.all(
      missing.map(async (email) => {
        try {
          const res = await axios.get<UserProfileMini>("/users/by-email", {
            params: { email },
          });
          setMiniByEmail((prev) => ({ ...prev, [email]: res.data || { email } }));
        } catch {
          // fallback: guardamos al menos el email para no reintentar infinito
          setMiniByEmail((prev) => ({ ...prev, [email]: { email } }));
        }
      })
    );
  };

  useEffect(() => {
    const load = async () => {
      if (!currentUser?.email) {
        setLoading(false);
        setError("You must be logged in to see your network.");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [myRes, pendingRes] = await Promise.all([
          axios.get<Connection[]>("/connections/my", {
            params: { email: currentUser.email },
          }),
          axios.get<Connection[]>("/connections/pending", {
            params: { email: currentUser.email },
          }),
        ]);

        const my = myRes.data ?? [];
        const pending = pendingRes.data ?? [];

        setMyConnections(my);
        setPendingInvites(pending);

        // ✅ hydrate minis (para avatar + badge)
        const emails = [...my, ...pending].map(getOtherEmail);
        await loadMiniForEmails(emails);

        refreshBadgesNow();
      } catch (err: any) {
        console.error("Error loading connections", err);
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Could not load your network.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.email]);

  // ---- actions ----
  const goToProfile = (otherId: number) => {
    navigate(`/users/${otherId}`, { state: { fromNetwork: true } });
  };

  const goToMessage = (otherEmail: string) => {
    navigate(`/messages/${encodeURIComponent(otherEmail)}`);
  };

  const refreshLists = async () => {
    if (!currentUser?.email) return;

    const [myRes, pendingRes] = await Promise.all([
      axios.get<Connection[]>("/connections/my", {
        params: { email: currentUser.email },
      }),
      axios.get<Connection[]>("/connections/pending", {
        params: { email: currentUser.email },
      }),
    ]);

    const my = myRes.data ?? [];
    const pending = pendingRes.data ?? [];

    setMyConnections(my);
    setPendingInvites(pending);

    // ✅ hydrate minis otra vez por si cambió algo
    const emails = [...my, ...pending].map(getOtherEmail);
    await loadMiniForEmails(emails);

    refreshBadgesNow();
  };

  const handleAccept = async (connectionId: number) => {
    if (!currentUser?.email) return;

    try {
      setUpdating(true);

      await axios.post(
        `/connections/${connectionId}/accept`,
        {},
        { params: { email: currentUser.email } }
      );

      await refreshLists();
    } catch (err: any) {
      console.error("Error accepting connection", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Could not accept this invitation.";
      alert(msg);
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async (connectionId: number) => {
    if (!currentUser?.email) return;
    if (!window.confirm("Do you want to reject this invitation?")) return;

    try {
      setUpdating(true);

      await axios.post(
        `/connections/${connectionId}/reject`,
        {},
        { params: { email: currentUser.email } }
      );

      await refreshLists();
    } catch (err: any) {
      console.error("Error rejecting connection", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Could not reject this invitation.";
      alert(msg);
    } finally {
      setUpdating(false);
    }
  };

  const renderAvatar = (c: Connection) => {
    const otherEmail = String(getOtherEmail(c) || "").trim().toLowerCase();
    const mini = otherEmail ? miniByEmail[otherEmail] : undefined;

    const avatarUrl = pickAvatarUrl(mini);
    const name = (mini?.fullName || getOtherName(c) || otherEmail || "User").toString();

    return (
      <div className="network-avatar" aria-label="avatar" style={{ overflow: "visible" }}>
        <AvatarWithBadge
          size={42}
          avatarUrl={avatarUrl}
          name={name}
          email={otherEmail || null}
          showReferralBadge={!!mini?.offersReferralFee}
        />

        {/* fallback ultra raro */}
        {!avatarUrl && !mini?.fullName ? (
          <span style={{ display: "none" }}>{getAvatarInitial(c)}</span>
        ) : null}
      </div>
    );
  };

  // ---- render ----
  if (loading) {
    return (
      <div className="page">
        <div className="network-container">
          <p className="dashboard-text">Loading your network...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="network-container">
          <p style={{ color: "#b91c1c" }}>{error}</p>
          <Link to="/dashboard" className="dashboard-link">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="network-container">
        <div className="network-header">
          <h1>My Network</h1>
          <p>
            Here you can see your accepted connections and pending invitations
            from other Rycus users.
          </p>
        </div>

        <div className="network-grid">
          {/* LEFT: Connections */}
          <section className="network-section">
            <h2>My Connections</h2>

            {myConnections.length === 0 ? (
              <p className="dashboard-text">
                You don&apos;t have any connections yet.
              </p>
            ) : (
              <div className="network-list">
                {myConnections.map((c) => {
                  const otherId = getOtherId(c);
                  const otherEmail = getOtherEmail(c);

                  return (
                    <div key={c.id} className="network-card">
                      <div className="network-card-left">
                        {renderAvatar(c)}

                        <div className="network-meta">
                          <div className="network-name">{getOtherName(c)}</div>
                          <div className="network-email">{otherEmail}</div>
                        </div>
                      </div>

                      <div className="network-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => goToProfile(otherId)}
                        >
                          View Profile
                        </button>

                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => goToMessage(otherEmail)}
                        >
                          💬 Send Message
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* RIGHT: Pending */}
          <section className="network-section">
            <h2>Pending Invitations</h2>

            {pendingInvites.length === 0 ? (
              <div className="network-empty">
                You don&apos;t have any pending invitations right now.
              </div>
            ) : (
              <div className="network-list">
                {pendingInvites.map((c) => {
                  const otherId = getOtherId(c);
                  const otherEmail = getOtherEmail(c);

                  return (
                    <div key={c.id} className="network-card">
                      <div className="network-card-left">
                        {renderAvatar(c)}

                        <div className="network-meta">
                          <div className="network-name">{getOtherName(c)}</div>
                          <div className="network-email">{otherEmail}</div>
                        </div>
                      </div>

                      <div className="network-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => goToMessage(otherEmail)}
                        >
                          💬 Message
                        </button>

                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleAccept(c.id)}
                          disabled={updating}
                        >
                          Accept
                        </button>

                        <button
                          type="button"
                          className="btn-secondary btn-danger"
                          onClick={() => handleReject(c.id)}
                          disabled={updating}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default UserConnectionsPage;