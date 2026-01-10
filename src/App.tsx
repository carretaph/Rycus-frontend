// src/App.tsx
import React, { useCallback, useEffect, useState } from "react";
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
  // 🤝 Pending connections badge
  // ============================
  const [pendingConnectionsCount, setPendingConnectionsCount] =
    useState<number>(0);

  const loadPendingConnections = useCallback(async () => {
    try {
      const email = user?.email?.trim();
      console.log("[pending-count] user.email =", email);

      if (!email) {
        setPendingConnectionsCount(0);
        return;
      }

      console.log("[pending-count] calling /connections/pending/count ...");

      // backend devuelve: { "count": 0 }
      const res = await axios.get<{ count: number }>(
        "/connections/pending/count",
        {
          params: { email },
        }
      );

      console.log("[pending-count] response =", res.data);

      const count = Number(res.data?.count ?? 0);
      setPendingConnectionsCount(Number.isFinite(count) ? count : 0);
    } catch (err) {
      console.log("[pending-count] error =", err);
      setPendingConnectionsCount(0);
    }
  }, [user?.email]);

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

  // Badge helper
  const Badge: React.FC<{ value: number }> = ({ value }) => {
    if (value <= 0) return null;

    return (
      <span
        style={{
          marginLeft: 6,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 22,
          height: 22,
          padding: "0 7px",
          borderRadius: 999,
          border: "1px solid #e5e7eb",
          fontWeight: 800,
          fontSize: 12,
        }}
      >
        {value}
      </span>
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
                <Badge value={pendingConnectionsCount} />
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
