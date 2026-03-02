// src/components/AvatarWithBadge.tsx
import { useEffect, useState } from "react";
import rfBadge from "../assets/badges/rf-badge.png";

function initial(name?: string | null, email?: string | null) {
  const n = (name || "").trim();
  if (n) return n.charAt(0).toUpperCase();
  const e = (email || "").trim();
  if (e) return e.charAt(0).toUpperCase();
  return "?";
}

type Props = {
  size?: number;
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;

  // prende/apaga badge
  showReferralBadge?: boolean;

  // opcional override
  badgeSrc?: string;
  badgeAlt?: string;

  // opcional: si quieres ajustar posición en páginas específicas
  badgeScale?: number; // default 0.44
  badgeOffset?: number; // default -2
};

export default function AvatarWithBadge({
  size = 42,
  avatarUrl,
  name,
  email,
  showReferralBadge = false,
  badgeSrc,
  badgeAlt = "RF badge",
  badgeScale = 0.44,
  badgeOffset = -2,
}: Props) {
  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    setImgOk(true);
  }, [avatarUrl]);

  const finalBadgeSrc = badgeSrc || (rfBadge as unknown as string);

  const badgeSize = Math.round(size * badgeScale);
  const offset = badgeOffset;

  const cleanUrl =
    typeof avatarUrl === "string" && avatarUrl.trim().length > 0
      ? avatarUrl.trim()
      : "";

  const showImg = !!cleanUrl && imgOk;

  return (
    // ✅ Outer wrapper: deja que el badge se salga
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        overflow: "visible",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
      }}
      title={(name || email || "").toString()}
    >
      {/* ✅ Inner circle: recorta SOLO la foto */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
          background: "#f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="avatar"
      >
        {showImg ? (
          <img
            src={cleanUrl}
            alt={(name || email || "avatar").toString()}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={() => setImgOk(false)}
          />
        ) : (
          <span style={{ fontWeight: 900, fontSize: Math.max(12, Math.round(size * 0.32)), color: "#111827" }}>
            {initial(name, email)}
          </span>
        )}
      </div>

      {/* ✅ Badge “por fuera” */}
      {showReferralBadge && (
        <img
          src={finalBadgeSrc}
          alt={badgeAlt}
          style={{
            position: "absolute",
            right: offset,
            bottom: offset,
            width: badgeSize,
            height: badgeSize,
            objectFit: "contain",
            pointerEvents: "none",

            // si NO quieres “circulito”, déjalo transparente:
            background: "transparent",
            borderRadius: 0,
            padding: 0,
            border: "none",
            boxShadow: "none",
          }}
        />
      )}
    </div>
  );
}