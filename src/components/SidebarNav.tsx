// src/components/SidebarNav.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  BarChart3,
  Users,
  Handshake,
  MessageCircle,
  UserSearch,
  PlusSquare,
  LogOut,
} from "lucide-react";

import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

import logoFull from "../assets/rycus-logo.png";
import logoIcon from "../assets/rycus-logo-check.png";

export default function SidebarNav() {
  // ✅ agarramos logout si existe; si no, hacemos fallback seguro
  const auth: any = useAuth();
  const user = auth?.user;
  const logoutFn = auth?.logout;

  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  // =========================
  // Unread badge
  // =========================
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const pollRef = useRef<number | null>(null);

  const userEmail = useMemo(() => {
    const email = user?.email;
    return typeof email === "string" ? email.trim() : "";
  }, [user?.email]);

  const inInbox = useMemo(() => {
    // cubre /inbox y /messages/*
    return (
      location.pathname.startsWith("/inbox") ||
      location.pathname.startsWith("/messages")
    );
  }, [location.pathname]);

  const fetchUnread = async () => {
    if (!userEmail) {
      setUnreadCount(0);
      return;
    }

    // Si estoy dentro del inbox, normalmente ya estoy leyendo / marcando read.
    // Ocultamos el badge para UX (y evitamos flicker).
    if (inInbox) {
      setUnreadCount(0);
      return;
    }

    try {
      const res = await axios.get<number>("/messages/unread-count", {
        params: { userEmail },
      });

      const n = Number(res.data);
      setUnreadCount(Number.isFinite(n) ? n : 0);
    } catch (e) {
      // silencioso: si falla no rompemos el sidebar
      // (puede fallar si aún no hay backend listo, etc.)
    }
  };

  useEffect(() => {
    // 1) fetch inicial
    fetchUnread();

    // 2) polling liviano
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => {
      fetchUnread();
    }, 12000);

    // 3) escucha evento global (tú ya lo estás usando)
    const onRefresh = () => fetchUnread();
    window.addEventListener("rycus:refresh-badges", onRefresh);

    return () => {
      window.removeEventListener("rycus:refresh-badges", onRefresh);
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, inInbox]);

  const initial = (
    user?.firstName?.[0] ||
    user?.name?.[0] ||
    user?.email?.[0] ||
    "U"
  ).toUpperCase();

  const handleLogout = () => {
    try {
      // 1) si tu AuthContext ya tiene logout(), úsalo
      if (typeof logoutFn === "function") {
        logoutFn();
        return;
      }
    } catch {
      // seguimos con fallback
    }

    // 2) fallback: limpiar y mandar al login
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <aside className="side">
      {/* BRAND / LOGO */}
      <Link to="/home" className="sideBrand" aria-label="Rycus Home">
        <img className="sideLogoIcon" src={logoIcon} alt="Rycus" />
        <img className="sideLogoFull" src={logoFull} alt="Rycus" />
      </Link>

      {/* NAV */}
      <nav className="sideNav">
        <Link
          to="/home"
          className={`sideItem ${isActive("/home") ? "active" : ""}`}
        >
          <Home size={22} className="sideSvg" />
          <span className="sideLabel">Home</span>
          <span className="tip">Home</span>
        </Link>

        <Link
          to="/dashboard"
          className={`sideItem ${isActive("/dashboard") ? "active" : ""}`}
        >
          <BarChart3 size={22} className="sideSvg" />
          <span className="sideLabel">Dashboard</span>
          <span className="tip">Dashboard</span>
        </Link>

        <Link
          to="/customers"
          className={`sideItem ${isActive("/customers") ? "active" : ""}`}
        >
          <Users size={22} className="sideSvg" />
          <span className="sideLabel">Customers</span>
          <span className="tip">Customers</span>
        </Link>

        <Link
          to="/connections"
          className={`sideItem ${isActive("/connections") ? "active" : ""}`}
        >
          <Handshake size={22} className="sideSvg" />
          <span className="sideLabel">Network</span>
          <span className="tip">Network</span>
        </Link>

        <Link
          to="/inbox"
          className={`sideItem ${isActive("/inbox") ? "active" : ""}`}
        >
          {/* wrapper para poder posicionar badge */}
          <span className="sideIconWrap">
            <MessageCircle size={22} className="sideSvg" />
            {unreadCount > 0 && (
              <span
                className="sideBadge"
                aria-label={`${unreadCount} unread messages`}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </span>

          <span className="sideLabel">Messages</span>
          <span className="tip">Messages</span>
        </Link>

        <Link
          to="/users"
          className={`sideItem ${isActive("/users") ? "active" : ""}`}
        >
          <UserSearch size={22} className="sideSvg" />
          <span className="sideLabel">Users</span>
          <span className="tip">Users</span>
        </Link>

        <Link to="/customers/new" className="sideItem">
          <PlusSquare size={22} className="sideSvg" />
          <span className="sideLabel">Add Customer</span>
          <span className="tip">Add Customer</span>
        </Link>
      </nav>

      {/* BOTTOM AREA */}
      <div className="sideBottom">
        {/* PROFILE */}
        <Link to="/profile" className="sideMe" aria-label="Profile">
          <div className="sideAvatarRing">
            {user?.avatarUrl ? (
              <img className="sideAvatarImg" src={user.avatarUrl} alt="Profile" />
            ) : (
              <div className="sideAvatarFallback">{initial}</div>
            )}
          </div>

          <div className="sideMeText">
            <div className="sideMeName">Profile</div>
            <div className="sideMeSub">{user?.email ?? ""}</div>
          </div>

          <span className="tip">Profile</span>
        </Link>

        {/* LOGOUT */}
        <button
          type="button"
          className="sideItem sideLogout"
          onClick={handleLogout}
          aria-label="Log out"
        >
          <LogOut size={22} className="sideSvg" />
          <span className="sideLabel">Log out</span>
          <span className="tip">Log out</span>
        </button>
      </div>
    </aside>
  );
}