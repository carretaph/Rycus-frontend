// src/pages/MessagesPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import AvatarWithBadge from "../components/AvatarWithBadge";

type Message = {
  id: number;

  senderEmail: string;
  senderName: string;
  senderAvatarUrl?: string | null;

  recipientEmail: string;
  recipientName: string;
  recipientAvatarUrl?: string | null;

  content: string;
  read: boolean;
  createdAt: string;
};

type UserMini = {
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  offersReferralFee?: boolean | null;
};

// Render/Postgres a veces manda timestamps sin timezone.
// Si NO viene zona horaria, asumimos UTC y agregamos "Z".
function safeDate(iso?: string | null): Date | null {
  if (!iso) return null;

  let s = String(iso).trim();
  if (!s) return null;

  // Normaliza "YYYY-MM-DD HH:mm:ss" => "YYYY-MM-DDTHH:mm:ss"
  s = s.replace(" ", "T");

  // ¿Trae timezone? (Z o +hh:mm / -hh:mm)
  const hasTimezone = /Z$/i.test(s) || /[+-]\d{2}:\d{2}$/.test(s);

  // Si no trae timezone, asumimos UTC
  const normalized = hasTimezone ? s : `${s}Z`;

  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function timeLabel(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

const MessagesPage: React.FC = () => {
  const auth: any = useAuth();
  const user = auth?.user;

  const params = useParams<{ otherEmail: string }>();

  const myEmail = (user?.email || "").trim();

  // decode por si viene bob%40gmail.com
  const otherEmail = useMemo(() => {
    const raw = params.otherEmail ?? "";
    try {
      return decodeURIComponent(raw).trim();
    } catch {
      return raw.trim();
    }
  }, [params.otherEmail]);

  const canLoad = useMemo(() => !!myEmail && !!otherEmail, [myEmail, otherEmail]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  // datos del otro usuario (para badge + avatar estable)
  const [otherAvatarUrl, setOtherAvatarUrl] = useState<string | null>(null);
  const [otherOffersRF, setOtherOffersRF] = useState<boolean>(false);
  const [otherFullName, setOtherFullName] = useState<string>(otherEmail);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const scrollBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  };

  // Detecta si el usuario está cerca del bottom para auto-scroll solo cuando corresponde
  const isNearBottom = () => {
    const el = listRef.current;
    if (!el) return true;
    const threshold = 120; // px
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  const loadOtherUser = async () => {
    if (!otherEmail) return;
    try {
      const res = await axios.get<UserMini>("/users/by-email", {
        params: { email: otherEmail },
      });

      const fullName = String(res.data?.fullName || "").trim();
      const avatar = String(res.data?.avatarUrl || "").trim();
      const offersRF = !!res.data?.offersReferralFee;

      setOtherFullName(fullName || otherEmail);
      setOtherAvatarUrl(avatar || null);
      setOtherOffersRF(offersRF);
    } catch {
      setOtherFullName(otherEmail);
      setOtherAvatarUrl(null);
      setOtherOffersRF(false);
    }
  };

  const markRead = async () => {
    if (!canLoad) return;
    await axios.put("/messages/mark-read", null, {
      params: { userEmail: myEmail, otherUserEmail: otherEmail },
    });
  };

  // Solo carga conversación (NO mark-read)
  const loadConversationOnly = async (opts?: { autoScroll?: boolean }) => {
    if (!canLoad) return;

    const shouldAutoScroll = opts?.autoScroll ?? false;
    const wasNearBottom = isNearBottom();

    const res = await axios.get<Message[]>("/messages/conversation", {
      params: { userEmail: myEmail, otherUserEmail: otherEmail },
    });

    const data = Array.isArray(res.data) ? res.data : [];
    setMessages(data);

    // Auto-scroll solo si:
    // - nos lo pidieron (ej: al entrar) o
    // - el usuario ya estaba abajo (no estamos leyendo mensajes viejos)
    if (shouldAutoScroll || wasNearBottom) scrollBottom();
  };

  // Inicial: cargar + marcar como leído 1 vez
  useEffect(() => {
    if (!canLoad) return;

    (async () => {
      try {
        setLoading(true);
        await loadOtherUser();
        await loadConversationOnly({ autoScroll: true });
        await markRead();
      } catch (e) {
        console.error("Error loading conversation", e);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoad, myEmail, otherEmail]);

  // Polling: refresca conversación mientras estás dentro del chat
  // (No hace mark-read para no spamear el backend)
  useEffect(() => {
    if (!canLoad) return;

    const interval = setInterval(() => {
      void loadConversationOnly();
    }, 4000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoad, myEmail, otherEmail]);

  const send = async () => {
    const content = text.trim();
    if (!content || !canLoad) return;

    setText("");

    try {
      await axios.post("/messages", {
        senderEmail: myEmail,
        recipientEmail: otherEmail,
        content,
      });

      await loadConversationOnly({ autoScroll: true });
      await markRead();
    } catch (e) {
      console.error("Send message failed", e);
      alert("No se pudo enviar el mensaje (revisa consola/backend).");
      await loadConversationOnly({ autoScroll: true });
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const lastMyId = useMemo(() => {
    const mine = [...messages]
      .reverse()
      .find((m) => (m.senderEmail || "").toLowerCase() === myEmail.toLowerCase());
    return mine?.id ?? null;
  }, [messages, myEmail]);

  const otherName = useMemo(() => {
    if (otherFullName && otherFullName.trim()) return otherFullName.trim();

    const any = messages.find(
      (m) =>
        (m.senderEmail || "").toLowerCase() === otherEmail.toLowerCase() ||
        (m.recipientEmail || "").toLowerCase() === otherEmail.toLowerCase()
    );

    if (!any) return otherEmail;

    const inferred =
      (any.senderEmail || "").toLowerCase() === myEmail.toLowerCase()
        ? any.recipientName
        : any.senderName;

    return (inferred || otherEmail).toString().trim() || otherEmail;
  }, [messages, myEmail, otherEmail, otherFullName]);

  // por si tu user en el token no trae offersReferralFee, igual no rompe
  const myOffersRF = !!(user as any)?.offersReferralFee;

  if (!myEmail) {
    return (
      <div className="card">
        <h2>Messages</h2>
        <p>You must be logged in.</p>
        <Link to="/login" className="btn">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Chat</h2>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            With: <b>{otherName}</b> <span style={{ marginLeft: 8 }}>{otherEmail}</span>
          </div>
        </div>

        <Link to="/inbox" className="btn">
          Back to Inbox
        </Link>
      </div>

      <div
        ref={listRef}
        style={{
          marginTop: 16,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          height: 420,
          overflowY: "auto",
          padding: 12,
          background: "#fafafa",
        }}
      >
        {loading && (
          <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 10 }}>
            Loading...
          </div>
        )}

        {messages.length === 0 && !loading ? (
          <div style={{ fontSize: 14, opacity: 0.8 }}>No messages yet. Say hi 👋</div>
        ) : (
          messages.map((m) => {
            const mine = (m.senderEmail || "").toLowerCase() === myEmail.toLowerCase();
            const date = safeDate(m.createdAt) ?? new Date();

            // Elegimos avatar correcto para el bubble
            const bubbleAvatar = mine
              ? m.senderAvatarUrl || user?.avatarUrl || null
              : (m.senderEmail || "").toLowerCase() === otherEmail.toLowerCase()
              ? m.senderAvatarUrl || otherAvatarUrl || null
              : m.recipientAvatarUrl || otherAvatarUrl || null;

            const bubbleName = mine ? m.senderName || "You" : m.senderName || otherName;

            const showRF = mine ? myOffersRF : otherOffersRF;

            // ✅ espacio para que el badge no choque con el borde/layaout
            const avatarPad = 8;

            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: mine ? "flex-end" : "flex-start",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: mine ? "row-reverse" : "row",
                    gap: 10,
                    maxWidth: "100%",
                    alignItems: "flex-end",
                  }}
                >
                  {/* ✅ wrapper con padding para que el badge se vea perfecto */}
                  <div
                    style={{
                      overflow: "visible",
                      flex: "0 0 auto",
                      paddingRight: mine ? avatarPad : 0,
                      paddingLeft: mine ? 0 : avatarPad,
                    }}
                  >
                    <AvatarWithBadge
                      size={34}
                      avatarUrl={bubbleAvatar}
                      name={mine ? (user?.firstName || user?.name || m.senderName) : otherName}
                      email={mine ? myEmail : otherEmail}
                      showReferralBadge={showRF}
                      badgeAlt="RF"
                      badgeOffset={-3}
                    />
                  </div>

                  <div
                    style={{
                      background: mine ? "#e0e7ff" : "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 10,
                      maxWidth: 560,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>
                      {mine ? "You" : bubbleName}
                    </div>

                    <div style={{ fontSize: 14 }}>{m.content}</div>

                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginTop: 6,
                        display: "flex",
                        gap: 10,
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{timeLabel(date)}</span>

                      {mine && lastMyId !== null && m.id === lastMyId && (
                        <span style={{ fontWeight: 700 }}>{m.read ? "Seen" : "Sent"}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter new line)"
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            minHeight: 44,
            maxHeight: 120,
            resize: "vertical",
          }}
        />

        <button className="btn" onClick={send} disabled={!text.trim()}>
          Send
        </button>
      </div>

      <div style={{ marginTop: 10 }}>
        <Link to="/inbox">Back to Inbox</Link>
      </div>
    </div>
  );
};

export default MessagesPage;