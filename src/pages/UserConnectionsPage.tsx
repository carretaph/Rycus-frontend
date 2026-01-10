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

const UserConnectionsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [myConnections, setMyConnections] = useState<Connection[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // ------------------------------------------------
  // helper: avisar al App.tsx que refresque badges
  // ------------------------------------------------
  const refreshBadgesNow = () => {
    window.dispatchEvent(new Event("rycus:refresh-badges"));
  };

  // ------------------------------------------------
  // Cargar conexiones + invitaciones pendientes
  // ------------------------------------------------
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

        setMyConnections(myRes.data);
        setPendingInvites(pendingRes.data);

        // ✅ al entrar a la página, sincroniza badge inmediatamente
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
  }, [currentUser]);

  // ------------------------------------------------
  // Helpers para mostrar "el otro usuario"
  // ------------------------------------------------
  const getOtherName = (c: Connection): string => {
    if (!currentUser?.email) {
      return `${c.requesterName} ↔ ${c.receiverName}`;
    }
    if (c.requesterEmail.toLowerCase() === currentUser.email.toLowerCase()) {
      return c.receiverName || c.receiverEmail;
    }
    return c.requesterName || c.requesterEmail;
  };

  const getOtherEmail = (c: Connection): string => {
    if (!currentUser?.email) {
      return `${c.requesterEmail} / ${c.receiverEmail}`;
    }
    if (c.requesterEmail.toLowerCase() === currentUser.email.toLowerCase()) {
      return c.receiverEmail;
    }
    return c.requesterEmail;
  };

  const getAvatarInitial = (c: Connection): string => {
    const name = getOtherName(c);
    if (name && name.trim().length > 0) {
      return name.trim().charAt(0).toUpperCase();
    }
    const email = getOtherEmail(c);
    if (email && email.trim().length > 0) {
      return email.trim().charAt(0).toUpperCase();
    }
    return "U";
  };

  const getOtherId = (c: Connection): number => {
    if (!currentUser?.email) {
      return c.receiverId;
    }
    if (c.requesterEmail.toLowerCase() === currentUser.email.toLowerCase()) {
      return c.receiverId;
    }
    return c.requesterId;
  };

  // ------------------------------------------------
  // Actions: View profile + Send message
  // ------------------------------------------------
  const goToProfile = (otherId: number) => {
    navigate(`/users/${otherId}`, { state: { fromNetwork: true } });
  };

  const goToMessage = (otherEmail: string) => {
    navigate(`/messages/${encodeURIComponent(otherEmail)}`);
  };

  // ------------------------------------------------
  // Aceptar / rechazar invitaciones
  // ------------------------------------------------
  const handleAccept = async (connectionId: number) => {
    if (!currentUser?.email) return;

    try {
      setUpdating(true);
      await axios.post(
        `/connections/${connectionId}/accept`,
        {},
        {
          params: { email: currentUser.email },
        }
      );

      // Refrescar listas
      const [myRes, pendingRes] = await Promise.all([
        axios.get<Connection[]>("/connections/my", {
          params: { email: currentUser.email },
        }),
        axios.get<Connection[]>("/connections/pending", {
          params: { email: currentUser.email },
        }),
      ]);

      setMyConnections(myRes.data);
      setPendingInvites(pendingRes.data);

      // ✅ badge instantáneo
      refreshBadgesNow();
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
        {
          params: { email: currentUser.email },
        }
      );

      const pendingRes = await axios.get<Connection[]>("/connections/pending", {
        params: { email: currentUser.email },
      });
      setPendingInvites(pendingRes.data);

      // ✅ badge instantáneo
      refreshBadgesNow();
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

  // ------------------------------------------------
  // Render
  // ------------------------------------------------
  if (loading) {
    return (
      <div className="page">
        <p>Loading your network...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <p style={{ color: "#b91c1c" }}>{error}</p>
        <Link to="/dashboard" className="dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>My Network</h1>
      <p className="dashboard-text" style={{ maxWidth: 640 }}>
        Here you can see your accepted connections and pending invitations from
        other Rycus users.
      </p>

      {/* Mis conexiones aceptadas */}
      <section style={{ marginTop: 24, marginBottom: 32 }}>
        <h2>My Connections</h2>

        {myConnections.length === 0 && (
          <p className="dashboard-text">
            You don&apos;t have any connections yet.
          </p>
        )}

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {myConnections.map((c) => {
            const otherId = getOtherId(c);
            const otherEmail = getOtherEmail(c);

            return (
              <div key={c.id} className="connection-simple-card">
                <div className="connection-avatar">{getAvatarInitial(c)}</div>

                <div className="connection-info" style={{ flex: 1 }}>
                  <span className="connection-name">{getOtherName(c)}</span>
                  <div style={{ fontSize: 13, opacity: 0.75 }}>
                    {otherEmail}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="dashboard-btn"
                    onClick={() => goToProfile(otherId)}
                  >
                    View Profile
                  </button>

                  <button
                    type="button"
                    className="dashboard-btn"
                    onClick={() => goToMessage(otherEmail)}
                  >
                    💬 Send Message
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Invitaciones pendientes */}
      <section style={{ marginTop: 24 }}>
        <h2>Pending Invitations</h2>

        {pendingInvites.length === 0 && (
          <p className="dashboard-text">
            You don&apos;t have any pending invitations right now.
          </p>
        )}

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {pendingInvites.map((c) => {
            const otherEmail = getOtherEmail(c);

            return (
              <div key={c.id} className="connection-pending-card">
                <div className="connection-left">
                  <div className="connection-avatar">{getAvatarInitial(c)}</div>
                  <div className="connection-info">
                    <span className="connection-name">{getOtherName(c)}</span>
                    <div style={{ fontSize: 13, opacity: 0.75 }}>
                      {otherEmail}
                    </div>
                  </div>
                </div>

                <div
                  className="connection-actions"
                  style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                  <button
                    type="button"
                    className="dashboard-btn"
                    onClick={() => goToMessage(otherEmail)}
                  >
                    💬 Message
                  </button>

                  <button
                    type="button"
                    className="dashboard-btn"
                    onClick={() => handleAccept(c.id)}
                    disabled={updating}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="dashboard-btn connection-reject-btn"
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
      </section>
    </div>
  );
};

export default UserConnectionsPage;
