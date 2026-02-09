// src/App.tsx
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import axios from "./api/axiosClient";

import "./App.css";

import { OWNER_EMAILS } from "./config/owners";

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

// ✅ BILLING / PAYMENT PAGES
import ActivatePage from "./pages/ActivatePage";
import BillingSuccessPage from "./pages/BillingSuccessPage";
import BillingCancelPage from "./pages/BillingCancelPage";

import logo from "./assets/rycus-logo.png";

function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return OWNER_EMAILS.map((x) => x.trim().toLowerCase()).includes(e);
}

function isFreeLifetimePlan(planType?: string | null): boolean {
  if (!planType) return false;
  return String(planType).trim().toUpperCase() === "FREE_LIFETIME";
}

function isVipUser(user: any): boolean {
  // VIP = Owner email OR planType FREE_LIFETIME OR internal owner marker
  return (
    isOwnerEmail(user?.email ?? null) ||
    isFreeLifetimePlan(user?.planType ?? null) ||
    String(user?.planType ?? "").toLowerCase() === "owner"
  );
}

/* ============================
   🔐 Protected Route (AUTH + optional BILLING)
   - requireAccess=false => solo login
   - requireAccess=true  => login + billing (unless VIP)
============================ */
function ProtectedRoute({
  children,
  requireAccess = true,
}: {
  children: ReactNode;
  requireAccess?: boolean;
}) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <div className="page">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const vip = isVipUser(user);

  // ✅ Si requiere billing y NO es VIP, y hasAccess es false => Activate
  if (requireAccess && !vip && user.hasAccess === false) {
    return (
      <Navigate to="/activate" replace state={{ from: location.pathname }} />
    );
  }

  return <>{children}</>;
}

/* ============================
   🌐 Public Only Route
============================ */
function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();

  if (initializing) return <div className="page">Loading...</div>;
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
    const url =
      typeof parsed?.avatarUrl === "string" ? parsed.avatarUrl.trim() : "";
    return url || null;
  } catch {
    return null;
  }
}

/* ============================
   APP
============================ */
export default function App() {
  const { user, logout, updateUser } = useAuth();
  const location = useLocation();

  const vip = isVipUser(user);

  // ============================
  // BILLING STATUS (anti-loop)
  // ============================
  const [billingChecked, setBillingChecked] = useState(false);

  const loadBillingStatus = useCallback(async () => {
    if (!user?.email) {
      setBillingChecked(true);
      return;
    }

    // ✅ VIP (OWNER o FREE_LIFETIME): acceso total, sin Stripe
    if (vip) {
      // marca hasAccess true siempre
      if (user.hasAccess === false) {
        updateUser({ hasAccess: true });
      }
      // si es owner email, opcionalmente marca planType="owner"
      if (isOwnerEmail(user.email) && user.planType !== "owner") {
        updateUser({ planType: "owner" });
      }
      setBillingChecked(true);
      return;
    }

    if (billingChecked) return;

    // ✅ En DEV no llamamos /billing/status
    if (import.meta.env.DEV) {
      if (user.hasAccess === false) updateUser({ hasAccess: true });
      setBillingChecked(true);
      return;
    }

    // ✅ PRODUCCIÓN:
    // 1) primero intenta refrescar planType desde /users/me (usa token por interceptor)
    //    así si el backend dice FREE_LIFETIME, lo tratamos como acceso total.
    try {
      const me = await axios.get("/users/me", { params: { email: user.email } });
      const pt = me.data?.planType;

      if (pt && user.planType !== pt) {
        updateUser({ planType: pt });
      }

      if (isFreeLifetimePlan(pt)) {
        updateUser({ hasAccess: true, planType: pt });
        setBillingChecked(true);
        return;
      }
    } catch {
      // si falla /users/me, seguimos a billing/status (no rompemos)
    }

    // 2) luego chequea billing/status para usuarios normales
    try {
      const res = await axios.get("/billing/status");

      const serverHasAccess =
        typeof res.data?.hasAccess === "boolean"
          ? res.data.hasAccess
          : typeof res.data?.active === "boolean"
          ? res.data.active
          : true;

      const planTypeFromServer = res.data?.planType;

      // Si el servidor reporta FREE_LIFETIME, forzamos acceso.
      if (isFreeLifetimePlan(planTypeFromServer)) {
        updateUser({ hasAccess: true, planType: planTypeFromServer });
      } else {
        if (user.hasAccess !== serverHasAccess) {
          updateUser({
            hasAccess: serverHasAccess,
            planType: planTypeFromServer,
          });
        } else if (typeof planTypeFromServer !== "undefined") {
          updateUser({ planType: planTypeFromServer });
        }
      }
    } catch (err: any) {
      // ⚠️ Si falla billing/status en producción, NO bypass
      if (user.hasAccess !== false) {
        updateUser({ hasAccess: false });
      }
    } finally {
      setBillingChecked(true);
    }
  }, [
    user?.email,
    user?.hasAccess,
    user?.planType,
    vip,
    billingChecked,
    updateUser,
  ]);

  useEffect(() => {
    if (!billingChecked) loadBillingStatus();
  }, [billingChecked, loadBillingStatus]);

  if (user && !billingChecked) {
    return <div className="page">Checking subscription…</div>;
  }

  // ✅ VIP siempre tiene acceso
  const hasAccess = vip ? true : user?.hasAccess !== false;

  // ============================
  // NAV INFO
  // ============================
  const navDisplayName =
    user?.firstName ||
    user?.name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Profile";

  const userInitial = navDisplayName.charAt(0).toUpperCase();

  const avatarFromStorage = readStoredAvatar(user?.email ?? null);
  const avatarToShow =
    (user?.avatarUrl && user.avatarUrl.trim()) || avatarFromStorage || "";

  // ============================
  // BADGES
  // ============================
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

  // ============================
  // UI
  // ============================
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
                <span>
                  {navDisplayName}
                  {isOwnerEmail(user.email) ? " 👑" : ""}
                  {isFreeLifetimePlan(user.planType) ? " ✅" : ""}
                </span>
              </Link>

              <Link to="/home">🏠 Home</Link>
              <Link to="/dashboard">📊 Dashboard</Link>

              {hasAccess && (
                <>
                  <Link to="/customers">👥 Customers</Link>

                  <Link to="/connections">
                    🤝 Network <Badge value={pendingConnectionsCount} />
                  </Link>

                  <Link to="/inbox">
                    💬 Messages <Badge value={unreadCount} />
                  </Link>

                  <Link to="/users">🙋‍♂️ Users</Link>
                </>
              )}

              {!hasAccess && !vip && (
                <Link to="/activate" style={{ fontWeight: 700 }}>
                  🔒 Activate
                </Link>
              )}

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

          {/* PRIVATE (login only) */}
          <Route
            path="/home"
            element={
              <ProtectedRoute requireAccess={false}>
                <FeedPage />
              </ProtectedRoute>
            }
          />

          {/* ✅ Dashboard requiere billing (o VIP) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireAccess={true}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* ✅ Activate / Billing routes (solo login) */}
          <Route
            path="/activate"
            element={
              <ProtectedRoute requireAccess={false}>
                <ActivatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/success"
            element={
              <ProtectedRoute requireAccess={false}>
                <BillingSuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/cancel"
            element={
              <ProtectedRoute requireAccess={false}>
                <BillingCancelPage />
              </ProtectedRoute>
            }
          />

          {/* ✅ GATED ROUTES */}
          <Route
            path="/customers"
            element={
              <ProtectedRoute requireAccess={true}>
                <CustomerListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/new"
            element={
              <ProtectedRoute requireAccess={true}>
                <CustomerCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/:id"
            element={
              <ProtectedRoute requireAccess={true}>
                <CustomerReviewsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/:id/edit"
            element={
              <ProtectedRoute requireAccess={true}>
                <CustomerEditPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute requireAccess={true}>
                <UsersSearchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/:id"
            element={
              <ProtectedRoute requireAccess={true}>
                <UserProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/connections"
            element={
              <ProtectedRoute requireAccess={true}>
                <UserConnectionsPage />
              </ProtectedRoute>
            }
          />

          {/* Profile (solo login) */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute requireAccess={false}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/inbox"
            element={
              <ProtectedRoute requireAccess={true}>
                <InboxPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/:otherEmail"
            element={
              <ProtectedRoute requireAccess={true}>
                <MessagesPage />
              </ProtectedRoute>
            }
          />

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
