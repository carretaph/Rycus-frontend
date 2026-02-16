// src/pages/UserConnectionsPage.tsx
import React, { useEffect, useState } from "react";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

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

// ✅ lo mínimo: solo lo que necesitamos para avatar
type UserProfileMini = {
  id?: number;
  avatarUrl?: string;
  profileImageUrl?: string;
  photoUrl?: string;
  pictureUrl?: string;
  imageUrl?: string;
};

const UserConnectionsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [myConnections, setMyConnections] = useState<Connection[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // ✅ cache { userId -> avatarUrl }
  const [avatarByUserId, setAvatarByUserId] = useState<Record<number, string>>(
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

  const pickAvatarUrl = (data: UserProfileMini): string => {
    // ✅ soporta varios nombres de campo (por si tu backend usa otro)
    const url =
      data?.avatarUrl ||
      data?.profileImageUrl ||
      data?.photoUrl ||
      data?.pictureUrl ||
      data?.imageUrl ||
      "";
    return typeof url === "string" ? url.trim() : "";
  };

  const loadAvatarsForUserIds = async (ids: number[]) => {
    const unique = Array.from(new Set(ids))
      .filter((x) => Number.isFinite(x))
      .filter((x) => x > 0);

    // solo los que aún no tenemos
    const missing = unique.filter((id) => !avatarByUserId[id]);
    if (missing.length === 0) return;

    try {
      // ⚠️ asume que existe GET /users/{id}
      // Si tu endpoint es distinto, cambia SOLO esta línea.
      const results = await Promise.all(
        missing.map(async (id) => {
          const res = await axios.get<UserProfileMini>(`/users/${id}`);
          const url = pickAvatarUrl(res.data ?? {});
          return [id, url] as const;
        })
      );

      setAvatarByUserId((prev) => {
        const next = { ...prev };
        for (const [id, url] of results) {
          if (url) next[id] = url; // si no hay url, dejamos inicial
        }
        return next;
      });
    } catch {
      // silencioso: si falla, queda inicial (no rompas la página)
    }
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

        // ✅ hydrate avatars
        const ids = [...my, ...pending].map(getOtherId);
        await loadAvatarsForUserIds(ids);

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

    // ✅ hydrate avatars otra vez por si cambió algo
    const ids = [...my, ...pending].map(getOtherId);
    await loadAvatarsForUserIds(ids);

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

  const renderAvatar = (otherId: number, c: Connection) => {
    const url = avatarByUserId[otherId];
    if (url) {
      return (
        <div className="network-avatar" aria-label="avatar">
          <img
            src={url}
            alt={getOtherName(c)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "999px",
              display: "block",
            }}
            onError={(e) => {
              // si la imagen falla, borramos cache para volver a inicial
              setAvatarByUserId((prev) => {
                const next = { ...prev };
                delete next[otherId];
                return next;
              });
              (e.currentTarget as HTMLImageElement).src = "";
            }}
          />
        </div>
      );
    }

    return <div className="network-avatar">{getAvatarInitial(c)}</div>;
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
                        {renderAvatar(otherId, c)}

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
                        {renderAvatar(otherId, c)}

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
