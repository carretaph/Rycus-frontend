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
  ShieldCheck,
} from "lucide-react";

import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

import logoFull from "../assets/rycus-logo-full.png";
import logoIcon from "../assets/rycus-logo-check.png";

const OWNER_EMAILS = ["carretaph@gmail.com"];

export default function SidebarNav() {
  const auth: any = useAuth();
  const user = auth?.user;
  const logoutFn = auth?.logout;

  const location = useLocation();

  const isAdmin =
    String(user?.role || "").toUpperCase() === "ADMIN" ||
    OWNER_EMAILS.includes(String(user?.email || "").toLowerCase());

  const isActive = (path: string) => {
    if (path === "/home") return location.pathname === "/home";
    if (path === "/dashboard") return location.pathname.startsWith("/dashboard");
    if (path === "/admin") return location.pathname.startsWith("/admin");
    if (path === "/customers") {
      return (
        location.pathname === "/customers" ||
        location.pathname.startsWith("/customers/")
      );
    }
    if (path === "/connections") return location.pathname.startsWith("/connections");
    if (path === "/inbox") {
      return (
        location.pathname.startsWith("/inbox") ||
        location.pathname.startsWith("/messages")
      );
    }
    if (path === "/users") return location.pathname.startsWith("/users");
    if (path === "/customers/new") return location.pathname === "/customers/new";
    if (path === "/profile") return location.pathname.startsWith("/profile");
    if (path === "/privacy") return location.pathname.startsWith("/privacy");
    if (path === "/terms") return location.pathname.startsWith("/terms");
    if (path === "/support") return location.pathname.startsWith("/support");
    return location.pathname.startsWith(path);
  };

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const pollRef = useRef<number | null>(null);

  const userEmail = useMemo(() => {
    const email = user?.email;
    return typeof email === "string" ? email.trim() : "";
  }, [user?.email]);

  const inInbox = useMemo(() => {
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
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 401 || status === 403) {
        console.warn("Unread blocked (auth mismatch) → ignoring");
        setUnreadCount(0);
        return;
      }

      console.error("Unread error", error);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchUnread();

    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => {
      fetchUnread();
    }, 12000);

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
      if (typeof logoutFn === "function") {
        logoutFn();
        return;
      }
    } catch {
      // fallback abajo
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <>
      <aside className="side">
        <Link to="/home" className="sideBrand" aria-label="Rycus Home">
          <img className="sideLogoIcon" src={logoIcon} alt="Rycus" />
          <img className="sideLogoFull" src={logoFull} alt="Rycus" />
        </Link>

        <nav className="sideNav">
          <Link to="/home" className={`sideItem ${isActive("/home") ? "active" : ""}`}>
            <Home size={22} className="sideSvg" />
            <span className="sideLabel">Home</span>
            <span className="tip">Home</span>
          </Link>

          <Link to="/dashboard" className={`sideItem ${isActive("/dashboard") ? "active" : ""}`}>
            <BarChart3 size={22} className="sideSvg" />
            <span className="sideLabel">Dashboard</span>
            <span className="tip">Dashboard</span>
          </Link>

          {isAdmin && (
            <Link to="/admin" className={`sideItem ${isActive("/admin") ? "active" : ""}`}>
              <ShieldCheck size={22} className="sideSvg" />
              <span className="sideLabel">Admin</span>
              <span className="tip">Admin</span>
            </Link>
          )}

          <Link to="/customers" className={`sideItem ${isActive("/customers") ? "active" : ""}`}>
            <Users size={22} className="sideSvg" />
            <span className="sideLabel">Customers</span>
            <span className="tip">Customers</span>
          </Link>

          <Link to="/connections" className={`sideItem ${isActive("/connections") ? "active" : ""}`}>
            <Handshake size={22} className="sideSvg" />
            <span className="sideLabel">Network</span>
            <span className="tip">Network</span>
          </Link>

          <Link to="/inbox" className={`sideItem ${isActive("/inbox") ? "active" : ""}`}>
            <span className="sideIconWrap">
              <MessageCircle size={22} className="sideSvg" />
              {unreadCount > 0 && (
                <span className="sideBadge" aria-label={`${unreadCount} unread messages`}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>
            <span className="sideLabel">Messages</span>
            <span className="tip">Messages</span>
          </Link>

          <Link to="/users" className={`sideItem ${isActive("/users") ? "active" : ""}`}>
            <UserSearch size={22} className="sideSvg" />
            <span className="sideLabel">Users</span>
            <span className="tip">Users</span>
          </Link>

          <Link to="/customers/new" className={`sideItem ${isActive("/customers/new") ? "active" : ""}`}>
            <PlusSquare size={22} className="sideSvg" />
            <span className="sideLabel">Add Customer</span>
            <span className="tip">Add Customer</span>
          </Link>

          <Link to="/privacy" className={`sideItem ${isActive("/privacy") ? "active" : ""}`}>
            <span className="sideSvg" aria-hidden="true">📄</span>
            <span className="sideLabel">Privacy</span>
            <span className="tip">Privacy</span>
          </Link>

          <Link to="/terms" className={`sideItem ${isActive("/terms") ? "active" : ""}`}>
            <span className="sideSvg" aria-hidden="true">📘</span>
            <span className="sideLabel">Terms</span>
            <span className="tip">Terms</span>
          </Link>

          <Link to="/support" className={`sideItem ${isActive("/support") ? "active" : ""}`}>
            <span className="sideSvg" aria-hidden="true">🛟</span>
            <span className="sideLabel">Support</span>
            <span className="tip">Support</span>
          </Link>
        </nav>

        <div className="sideBottom">
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

          <button type="button" className="sideItem sideLogout" onClick={handleLogout} aria-label="Log out">
            <LogOut size={22} className="sideSvg" />
            <span className="sideLabel">Log out</span>
            <span className="tip">Log out</span>
          </button>
        </div>
      </aside>

      <nav className="mobileBottomNav" aria-label="Mobile navigation">
        <Link to="/home" className={`mobileBottomItem ${isActive("/home") ? "active" : ""}`}>
          <Home size={22} />
        </Link>

        <Link to="/dashboard" className={`mobileBottomItem ${isActive("/dashboard") ? "active" : ""}`}>
          <BarChart3 size={22} />
        </Link>

        {isAdmin && (
          <Link to="/admin" className={`mobileBottomItem ${isActive("/admin") ? "active" : ""}`}>
            <ShieldCheck size={22} />
          </Link>
        )}

        <Link to="/customers" className={`mobileBottomItem ${isActive("/customers") ? "active" : ""}`}>
          <Users size={22} />
        </Link>

        <Link to="/connections" className={`mobileBottomItem ${isActive("/connections") ? "active" : ""}`}>
          <Handshake size={22} />
        </Link>

        <Link to="/inbox" className={`mobileBottomItem ${isActive("/inbox") ? "active" : ""}`}>
          <span className="sideIconWrap">
            <MessageCircle size={22} />
            {unreadCount > 0 && (
              <span className="sideBadge" aria-label={`${unreadCount} unread messages`}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </span>
        </Link>

        <Link to="/users" className={`mobileBottomItem ${isActive("/users") ? "active" : ""}`}>
          <UserSearch size={22} />
        </Link>

        <Link to="/customers/new" className={`mobileBottomItem ${isActive("/customers/new") ? "active" : ""}`}>
          <PlusSquare size={22} />
        </Link>

        <Link to="/profile" className={`mobileBottomItem mobileProfileItem ${isActive("/profile") ? "active" : ""}`}>
          {user?.avatarUrl ? (
            <img className="mobileProfileAvatar" src={user.avatarUrl} alt="Profile" />
          ) : (
            <div className="mobileProfileFallback">{initial}</div>
          )}
        </Link>
      </nav>
    </>
  );
}