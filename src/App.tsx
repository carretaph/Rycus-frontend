// src/App.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import axios from "./api/axiosClient";

import "./App.css";

// Pages
import HomePage from "./HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CustomerCreatePage from "./pages/CustomerCreate";
import CustomerListPage from "./pages/CustomerList";
import CustomerReviewsPage from "./pages/CustomerReviewsPage";
import UsersSearchPage from "./pages/UsersSearchPage";
import UserProfilePage from "./pages/UserProfilePage";
import UserConnectionsPage from "./pages/UserConnectionsPage";
import ProfilePage from "./pages/ProfilePage";
import CustomerEditPage from "./pages/CustomerEdit";
import MessagesPage from "./pages/MessagesPage";
import InboxPage from "./pages/InboxPage";

import logo from "./assets/rycus-logo.png";

// ============================
// 🔐 Protected route
// ============================
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="page">
        <main className="main">
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// ============================
// Sound helper (no mp3 needed)
// ============================
function playSoftDing() {
  try {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = 880;

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);

    osc.onended = () => {
      try {
        ctx.close();
      } catch {}
    };
  } catch {
    // ignore
  }
}

// ============================
// APP
// ============================
const App: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Display name in nav
  const navDisplayName =
    (user?.firstName?.trim() && user.firstName.trim()) ||
    (user?.name?.trim() && user.name.trim().split(" ")[0]) ||
    (user?.email && user.email.split("@")[0]) ||
    "Profile";

  // Avatar initial
  const userInitial =
    user?.firstName?.trim().charAt(0).toUpperCase() ||
    user?.name?.trim().charAt(0).toUpperCase() ||
    user?.email?.charAt(0).toUpperCase() ||
    "?";

  // ============================
  // 🔔 Sound toggle (saved) — control lives in Profile
  // ============================
  const SOUND_KEY = "rycus_sound_enabled";
  const [soundEnabled] = useState<boolean>(() => {
    const raw = localStorage.getItem(SOUND_KEY);
    if (raw === null) return true; // default ON
    return raw === "true";
  });

  // ============================
  // 💬 Unread messages badge
  // ============================
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const loadUnread = useCallback(async () => {
    try {
      const userEmail = user?.email?.trim();
      if (!userEmail) {
        setUnreadCount(0);
        return;
      }

      const res = await axios.get<number>("/messages/unread-count", {
        params: { userEmail },
      });

      setUnreadCount(typeof res.data === "number" ? res.data : 0);
    } catch {
      setUnreadCount(0);
    }
  }, [user?.email]);

  // ============================
  // 🤝 Pending connections badge + pulse + sound
  // ============================
  const [pendingConnectionsCount, setPendingConnectionsCount] =
    useState<number>(0);

  const prevPendingRef = useRef<number>(0);
  const [pulseNetwork, setPulseNetwork] = useState(false);

  const loadPendingConnections = useCallback(async () => {
    try {
      const email = user?.email?.trim();
      if (!email) {
        setPendingConnectionsCount(0);
        prevPendingRef.current = 0;
        return;
      }

      const res = await axios.get<{ count: number }>(
        "/connections/pending/count",
        { params: { email } }
      );

      const next = Number(res.data?.count ?? 0);
      const safeNext = Number.isFinite(next) ? next : 0;

      const prev = prevPendingRef.current;

      if (safeNext > prev) {
        setPulseNetwork(true);
        window.setTimeout(() => setPulseNetwork(false), 1200);

        if (soundEnabled) {
          playSoftDing();
        }
      }

      prevPendingRef.current = safeNext;
      setPendingConnectionsCount(safeNext);
    } catch {
      setPendingConnectionsCount(0);
      prevPendingRef.current = 0;
    }
  }, [user?.email, soundEnabled]);

  // ============================
  // ✅ Polling normal (Messages + Network)
  // ============================
  useEffect(() => {
    let timer: number | undefined;

    void loadUnread();
    void loadPendingConnections();

    timer = window.setInterval(() => {
      void loadUnread();
      void loadPendingConnections();
    }, 12000);

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [loadUnread, loadPendingConnections]);

  // ✅ Refrescar cuando cambias de ruta
  useEffect(() => {
    void loadUnread();
    void loadPendingConnections();
  }, [location.pathname, loadUnread, loadPendingConnections]);

  // ✅ Refresh instantáneo desde otras páginas
  useEffect(() => {
    const onRefresh = () => {
      void loadUnread();
      void loadPendingConnections();
    };

    window.addEventListener("rycus:refresh-badges", onRefresh);
    return () => window.removeEventListener("rycus:refresh-badges", onRefresh);
  }, [loadUnread, loadPendingConnections]);

  // Badge component
  const Badge: React.FC<{ value: number; pulse?: boolean }> = ({
    value,
    pulse,
  }) => {
    if (value <= 0) return null;
    return (
      <span className={`badge ${pulse ? "badge--pulse" : ""}`}>{value}</span>
    );
  };

  return (
    <div className="app">
      <header className="site-header">
        {/* Logo */}
        <div className="site-header-logo-block">
          <img src={logo} alt="Rycus" className="site-header-logo" />
          <div className="site-header-title">Rycus</div>
          <div className="site-header-subtitle">Rate Your Customer US</div>
        </div>

        {/* NAV */}
        <nav className="site-header-nav">
          {user ? (
            <>
              {/* Profile */}
              <Link to="/profile" className="nav-profile-link">
                <div className="nav-avatar">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="avatar" />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </div>
                <span>{navDisplayName}</span>
              </Link>

              <Link to="/">🏠 Home</Link>
              <Link to="/dashboard">📊 Dashboard</Link>
              <Link to="/customers">👥 Customers</Link>

              {/* 🤝 Network badge */}
              <Link
                to="/connections"
                style={{ display: "inline-flex", alignItems: "center" }}
              >
                🤝 Network
                <Badge value={pendingConnectionsCount} pulse={pulseNetwork} />
              </Link>

              {/* 💬 Messages badge */}
              <Link
                to="/inbox"
                style={{ display: "inline-flex", alignItems: "center" }}
              >
                💬 Messages
                <Badge value={unreadCount} />
              </Link>

              <Link to="/users">🙋‍♂️ Users</Link>

              <button className="logoutBtn" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              {/* Public menu */}
              <Link to="/">🏠 Home</Link>
              <Link to="/login">Sign in</Link>
              <Link to="/register">Create account</Link>
            </>
          )}
        </nav>
      </header>

      <main className="main">
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Private */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <CustomerListPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers/new"
            element={
              <ProtectedRoute>
                <CustomerCreatePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers/:id"
            element={
              <ProtectedRoute>
                <CustomerReviewsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers/:id/edit"
            element={
              <ProtectedRoute>
                <CustomerEditPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <UsersSearchPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users/:id"
            element={
              <ProtectedRoute>
                <UserProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/connections"
            element={
              <ProtectedRoute>
                <UserConnectionsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Inbox / Messages */}
          <Route
            path="/inbox"
            element={
              <ProtectedRoute>
                <InboxPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/messages/:otherEmail"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
