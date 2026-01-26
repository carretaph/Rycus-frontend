// src/App.tsx
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import axios from "./api/axiosClient";

import "./App.css";

// ===== PUBLIC PAGES =====
import HomePage from "./HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

// ===== PRIVATE PAGES =====
import FeedPage from "./pages/FeedPage";
import DashboardPage from "./pages/DashboardPage";
import CustomerCreatePage from "./pages/CustomerCreate";
import CustomerListPage from "./pages/CustomerList";
import CustomerReviewsPage from "./pages/CustomerReviewsPage";
import CustomerEditPage from "./pages/CustomerEdit";
import UsersSearchPage from "./pages/UsersSearchPage";
import UserProfilePage from "./pages/UserProfilePage";
import UserConnectionsPage from "./pages/UserConnectionsPage";
import ProfilePage from "./pages/ProfilePage";
import InboxPage from "./pages/InboxPage";
import MessagesPage from "./pages/MessagesPage";

import logo from "./assets/rycus-logo.png";

/* ============================
   🔐 Protected Route
============================ */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <div className="page">Loading...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/* ============================
   🌐 Public Only Route
============================ */
function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <div className="page">Loading...</div>;
  }

  if (user) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

/* ============================
   Avatar fallback (localStorage extra)
============================ */
function readStoredAvatar(email?: string | null): string | null {
  try {
    if (!email) return null;
    const key = `rycus_profile_extra_${email.toLowerCase()}`;
    const raw = localStorage.getItem(key);
    if (!raw || raw === "undefined" || raw === "null") return null;
    const parsed = JSON.parse(raw);
    const url = typeof parsed?.avatarUrl === "string" ? parsed.avatarUrl.trim() : "";
    return url ? url : null;
  } catch {
    return null;
  }
}

/* ============================
   APP
============================ */
export default function App() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // ===== Display name =====
  const navDisplayName =
    user?.firstName ||
    user?.name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Profile";

  const userInitial = navDisplayName.charAt(0).toUpperCase();

  // ✅ Avatar to show (user first, fallback to localStorage extra)
  const avatarFromStorage = readStoredAvatar(user?.email ?? null);
  const avatarToShow =
    (user?.avatarUrl && user.avatarUrl.trim()) ||
    avatarFromStorage ||
    "";

  // ===== Badges =====
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingConnectionsCount, setPendingConnectionsCount] = useState(0);
  const prevPendingRef = useRef(0);

  const loadUnread = useCallback(async () => {
    if (!user?.email) return setUnreadCount(0);
    try {
      const res = await axios.get<number>("/messages/unread-count", {
        params: { userEmail: user.email },
      });
      setUnreadCount(res.data ?? 0);
    } catch {
      setUnreadCount(0);
    }
  }, [user?.email]);

  const loadPendingConnections = useCallback(async () => {
    if (!user?.email) return setPendingConnectionsCount(0);
    try {
      const res = await axios.get<{ count: number }>(
        "/connections/pending/count",
        { params: { email: user.email } }
      );
      const next = res.data?.count ?? 0;
      prevPendingRef.current = next;
      setPendingConnectionsCount(next);
    } catch {
      setPendingConnectionsCount(0);
    }
  }, [user?.email]);

  useEffect(() => {
    loadUnread();
    loadPendingConnections();
  }, [location.pathname, loadUnread, loadPendingConnections]);

  const Badge = ({ value }: { value: number }) =>
    value > 0 ? <span className="badge">{value}</span> : null;

  return (
    <div className="app">
      {/* ========== HEADER ========== */}
      <header className="site-header">
        <div className="site-header-logo-block">
          <img src={logo} alt="Rycus" className="site-header-logo" />
          <div className="site-header-title">Rycus</div>
          <div className="site-header-subtitle">Rate Your Customer US</div>
        </div>

        <nav className="site-header-nav">
          {user ? (
            <>
              <Link to="/profile" className="nav-profile-link">
                <div className="nav-avatar">
                  {avatarToShow ? (
                    <img src={avatarToShow} alt="avatar" />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </div>
                <span>{navDisplayName}</span>
              </Link>

              <Link to="/home">🏠 Home</Link>
              <Link to="/dashboard">📊 Dashboard</Link>
              <Link to="/customers">👥 Customers</Link>

              <Link to="/connections">
                🤝 Network <Badge value={pendingConnectionsCount} />
              </Link>

              <Link to="/inbox">
                💬 Messages <Badge value={unreadCount} />
              </Link>

              <Link to="/users">🙋‍♂️ Users</Link>

              <button className="logoutBtn" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/">🏠 Home</Link>
              <Link to="/login">Sign in</Link>
              <Link to="/register">Create account</Link>
            </>
          )}
        </nav>
      </header>

      {/* ========== ROUTES ========== */}
      <main className="main">
        <Routes>
          {/* PUBLIC */}
          <Route
            path="/"
            element={
              <PublicOnlyRoute>
                <HomePage />
              </PublicOnlyRoute>
            }
          />

          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />

          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />

          {/* PRIVATE */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <FeedPage />
              </ProtectedRoute>
            }
          />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute><CustomerListPage /></ProtectedRoute>} />
          <Route path="/customers/new" element={<ProtectedRoute><CustomerCreatePage /></ProtectedRoute>} />
          <Route path="/customers/:id" element={<ProtectedRoute><CustomerReviewsPage /></ProtectedRoute>} />
          <Route path="/customers/:id/edit" element={<ProtectedRoute><CustomerEditPage /></ProtectedRoute>} />

          <Route path="/users" element={<ProtectedRoute><UsersSearchPage /></ProtectedRoute>} />
          <Route path="/users/:id" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
          <Route path="/connections" element={<ProtectedRoute><UserConnectionsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          <Route path="/inbox" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
          <Route path="/messages/:otherEmail" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
