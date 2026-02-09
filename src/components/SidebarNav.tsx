import { Link, useLocation } from "react-router-dom";
import {
  Home,
  BarChart3,
  Users,
  Handshake,
  MessageCircle,
  UserSearch,
  PlusSquare,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

import logoFull from "../assets/rycus-logo.png";
import logoIcon from "../assets/rycus-logo-check.png";

export default function SidebarNav() {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <aside className="side">
      {/* BRAND */}
      <Link to="/home" className="sideBrand" aria-label="Rycus">
        {/* ✅ Compact: check */}
        <img src={logoIcon} alt="Rycus" className="sideLogoIcon" />
        {/* ✅ Expanded: full logo */}
        <img src={logoFull} alt="Rycus" className="sideLogoFull" />
      </Link>

      {/* NAV */}
      <nav className="sideNav">
        <Link to="/home" className={`sideItem ${isActive("/home") ? "active" : ""}`}>
          <Home className="sideIcon" />
          <span className="sideLabel">Home</span>
          <span className="tip">Home</span>
        </Link>

        <Link
          to="/dashboard"
          className={`sideItem ${isActive("/dashboard") ? "active" : ""}`}
        >
          <BarChart3 className="sideIcon" />
          <span className="sideLabel">Dashboard</span>
          <span className="tip">Dashboard</span>
        </Link>

        <Link
          to="/customers"
          className={`sideItem ${isActive("/customers") ? "active" : ""}`}
        >
          <Users className="sideIcon" />
          <span className="sideLabel">Customers</span>
          <span className="tip">Customers</span>
        </Link>

        <Link
          to="/connections"
          className={`sideItem ${isActive("/connections") ? "active" : ""}`}
        >
          <Handshake className="sideIcon" />
          <span className="sideLabel">Network</span>
          <span className="tip">Network</span>
        </Link>

        <Link
          to="/inbox"
          className={`sideItem ${isActive("/inbox") ? "active" : ""}`}
        >
          <MessageCircle className="sideIcon" />
          <span className="sideLabel">Messages</span>
          <span className="tip">Messages</span>
        </Link>

        <Link to="/users" className={`sideItem ${isActive("/users") ? "active" : ""}`}>
          <UserSearch className="sideIcon" />
          <span className="sideLabel">Users</span>
          <span className="tip">Users</span>
        </Link>

        <Link to="/customers/new" className="sideItem">
          <PlusSquare className="sideIcon" />
          <span className="sideLabel">Add Customer</span>
          <span className="tip">Add Customer</span>
        </Link>
      </nav>

      {/* PROFILE */}
      <Link to="/profile" className="sideMe" aria-label="Profile">
        <div className="sideAvatarRing">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="avatar" />
          ) : (
            <div className="sideAvatarFallback">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </div>
          )}
        </div>

        {/* ✅ solo expandido */}
        <span className="sideProfileLabel">Profile</span>
      </Link>
    </aside>
  );
}
