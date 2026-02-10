// src/components/SidebarNav.tsx
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
          <MessageCircle size={22} className="sideSvg" />
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
              <img
                className="sideAvatarImg"
                src={user.avatarUrl}
                alt="Profile"
              />
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
