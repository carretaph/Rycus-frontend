// src/pages/MessagesPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

type Message = {
  id: number;
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  recipientName: string;
  content: string;
  read: boolean;
  createdAt: string;
};

type UserMini = {
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
};

function safeDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayLabel(date: Date) {
  const today = startOfDay(new Date());
  const d0 = startOfDay(date);
  const diffDays = Math.round((today.getTime() - d0.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeLabel(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function initialFromNameOrEmail(name?: string | null, email?: string | null) {
  const n = (name || "").trim();
  if (n) return n.charAt(0).toUpperCase();
  const e = (email || "").trim();
  if (e) return e.charAt(0).toUpperCase();
  return "?";
}

function cleanDisplayName(name?: string | null, fallbackEmail?: string | null) {
  const n = (name || "").trim();
  if (n) return n;
  return (fallbackEmail || "").trim() || "User";
}

const AvatarBubble: React.FC<{
  size?: number;
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;
}> = ({ size = 34, avatarUrl, name, email }) => {
  const initial = initialFromNameOrEmail(name, email);

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
      title={cleanDisplayName(name, email)}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={cleanDisplayName(name, email)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span style={{ fontWeight: 800, fontSize: 13, color: "#111827" }}>
          {initial}
        </span>
      )}
    </div>
  );
};

const MessagesPage: React.FC = () => {
  const params = useParams<{ otherEmail: string }>();
  const { user } = useAuth();

  const myEmail = user?.email?.trim() ?? "";

  // ✅ decode por si viene bob%40gmail.com
  const otherEmail = useMemo(() => {
    const raw = params.otherEmail ?? "";
    try {
      return decodeURIComponent(raw).trim();
    } catch {
      return raw.trim();
    }
  }, [params.otherEmail]);

  const [otherName, setOtherName] = useState<string>(otherEmail || "");
  const [otherAvatarUrl, setOtherAvatarUrl] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const canLoad = useMemo(() => !!myEmail && !!otherEmail, [myEmail, otherEmail]);

  const scrollBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  };

  // ✅ Cargar info del otro usuario (avatar + fullName)
  const loadOtherUser = async () => {
    if (!otherEmail) return;

    try {
      /**
       * 👉 AJUSTA ESTE ENDPOINT si tu backend usa otro:
       * - /users/by-email
       * - /users/public
       * - /users/lookup
       * etc.
       *
       * Debe devolver algo como: { fullName, avatarUrl }
       */
      const res = await axios.get<UserMini>("/users/by-email", {
        params: { email: otherEmail },
      });

      const fullName = (res.data?.fullName || "").trim();
      const avatar = (res.data?.avatarUrl || "").trim();

      if (fullName) setOtherName(fullName);
      else setOtherName(otherEmail);

      setOtherAvatarUrl(avatar || null);
    } catch {
      // si no existe endpoint o falla, seguimos con fallback
      setOtherAvatarUrl(null);
      setOtherName(otherEmail);
    }
  };

  const loadConversation = async () => {
    if (!canLoad) return;

    setLoading(true);
    try {
      const res = await axios.get<Message[]>("/messages/conversation", {
        params: { userEmail: myEmail, otherUserEmail: otherEmail },
      });

      const data = Array.isArray(res.data) ? res.data : [];
      setMessages(data);

      // ✅ inferir nombre del otro lado si viene en los mensajes
      const first = data[0];
      if (first) {
        const inferred =
          first.senderEmail?.toLowerCase() === myEmail.toLowerCase()
            ? first.recipientName
            : first.senderName;

        if (inferred && inferred.trim()) setOtherName(inferred.trim());
        else setOtherName(otherEmail);
      } else {
        setOtherName(otherEmail);
      }

      // ✅ marcar como leído al abrir conversación
      await axios.put("/messages/mark-read", null, {
        params: { userEmail: myEmail, otherUserEmail: otherEmail },
      });
    } catch (e) {
      console.error("Error loading conversation", e);
    } finally {
      setLoading(false);
      scrollBottom();
    }
  };

  useEffect(() => {
    setOtherName(otherEmail || "");
    void loadOtherUser();     // avatar del otro
    void loadConversation();  // mensajes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherEmail, myEmail]);

  const send = async () => {
    const content = text.trim();
    if (!content || !canLoad) return;

    setText("");

    const payload = {
      senderEmail: myEmail,
      recipientEmail: otherEmail,
      content,
    };

    // ✅ optimistic: NO usar "You" como nombre (eso te generaba la "Y")
    const myDisplayName =
      (user?.firstName?.trim() && user.firstName.trim()) ||
      (user?.name?.trim() && user.name.trim()) ||
      (user?.email && user.email.split("@")[0]) ||
      "Me";

    const optimistic: Message = {
      id: Date.now(),
      senderEmail: myEmail,
      senderName: myDisplayName,
      recipientEmail: otherEmail,
      recipientName: otherName || otherEmail,
      content,
      read: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    scrollBottom();

    try {
      await axios.post("/messages", payload);
      await loadConversation();
    } catch (e) {
      console.error("Send message failed", e);
      await loadConversation();
      alert("No se pudo enviar el mensaje (revisa consola/backend).");
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  // ✅ read receipts: buscamos el ÚLTIMO mensaje mío
  const lastMyMessageId = useMemo(() => {
    const mine = [...messages].reverse().find((m) =>
      (m.senderEmail || "").toLowerCase() === myEmail.toLowerCase()
    );
    return mine?.id ?? null;
  }, [messages, myEmail]);

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Chat</h2>
          <div style={{ opacity: 0.8, fontSize: 14 }}>
            With: <b>{otherName || otherEmail}</b>{" "}
            <span style={{ marginLeft: 8 }}>{otherEmail}</span>
          </div>
        </div>

        <Link className="btn" to="/inbox">
          Back to Inbox
        </Link>
      </div>

      <div
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
        {loading && <div style={{ fontSize: 14, opacity: 0.7 }}>Loading...</div>}

        {messages.length === 0 && !loading ? (
          <div style={{ fontSize: 14, opacity: 0.8 }}>No messages yet. Say hi 👋</div>
        ) : (
          messages.map((m, idx) => {
            const mine =
              (m.senderEmail || "").toLowerCase() === myEmail.toLowerCase();

            const thisDate = safeDate(m.createdAt) ?? new Date();
            const prev = idx > 0 ? messages[idx - 1] : null;
            const prevDate = prev ? safeDate(prev.createdAt) : null;

            const showDaySeparator = !prevDate || !sameDay(thisDate, prevDate);

            const showSeen =
              mine && lastMyMessageId !== null && m.id === lastMyMessageId;

            const bubbleBg = mine ? "#e0e7ff" : "#ffffff";

            // avatar data
            const myAvatar = user?.avatarUrl || null;
            const myName =
              (user?.firstName?.trim() && user.firstName.trim()) ||
              (user?.name?.trim() && user.name.trim()) ||
              null;

            const otherBubbleName = (m.senderName || otherName || otherEmail) as string;

            return (
              <React.Fragment key={m.id}>
                {showDaySeparator && (
                  <div style={{ display: "flex", justifyContent: "center", margin: "14px 0" }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#6b7280",
                        background: "#f3f4f6",
                        border: "1px solid #e5e7eb",
                        padding: "6px 10px",
                        borderRadius: 999,
                      }}
                    >
                      {dayLabel(thisDate)}
                    </span>
                  </div>
                )}

                <div
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
                      alignItems: "flex-end",
                      gap: 10,
                      maxWidth: "100%",
                    }}
                  >
                    {/* ✅ Avatar al costado */}
                    <AvatarBubble
                      size={34}
                      avatarUrl={mine ? myAvatar : otherAvatarUrl}
                      name={mine ? myName : otherName}
                      email={mine ? myEmail : otherEmail}
                    />

                    <div
                      style={{
                        maxWidth: 560,
                        padding: "10px 12px",
                        borderRadius: 14,
                        background: bubbleBg,
                        border: "1px solid #e5e7eb",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>
                        {mine ? "You" : otherBubbleName}
                      </div>

                      <div style={{ fontSize: 14 }}>{m.content}</div>

                      {/* ✅ hora SIEMPRE + Seen/Sent */}
                      <div
                        style={{
                          marginTop: 6,
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          fontSize: 12,
                          color: "#6b7280",
                          opacity: 0.9,
                        }}
                      >
                        <span>{timeLabel(thisDate)}</span>

                        {showSeen && (
                          <span style={{ fontWeight: 700 }}>
                            {m.read ? "Seen" : "Sent"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter new line)"
          style={{
            flex: 1,
            minHeight: 44,
            maxHeight: 120,
            resize: "vertical",
            padding: 10,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
          }}
        />
        <button className="btn" onClick={send} disabled={!text.trim()}>
          Send
        </button>
      </div>
    </div>
  );
};

export default MessagesPage;
