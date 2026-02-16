// src/App.tsx
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import axios from "./api/axiosClient";

import "./App.css";

import { OWNER_EMAILS } from "./config/owners";

// ✅ Sidebar
import SidebarNav from "./components/SidebarNav";

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

// ===== BILLING =====
import ActivatePage from "./pages/ActivatePage";
import BillingSuccessPage from "./pages/BillingSuccessPage";
import BillingCancelPage from "./pages/BillingCancelPage";

import logo from "./assets/rycus-logo.png";

/* =========================================================
   HELPERS
========================================================= */

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
  return (
    isOwnerEmail(user?.email ?? null) ||
    isFreeLifetimePlan(user?.planType ?? null) ||
    String(user?.planType ?? "").toLowerCase() === "owner"
  );
}

/* =========================================================
   🔐 Protected Route
========================================================= */

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

  if (requireAccess && !vip && user.hasAccess === false) {
    return (
      <Navigate
        to="/activate"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <>{children}</>;
}

/* =========================================================
   🌐 Public Only Route
========================================================= */

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();

  if (initializing) return <div className="page">Loading...</div>;
  if (user) return <Navigate to="/home" replace />;

  return <>{children}</>;
}

/* =========================================================
   APP
========================================================= */

export default function App() {
  const { user, updateUser } = useAuth();
  const vip = isVipUser(user);

  const [billingChecked, setBillingChecked] = useState(false);

  /* ================= BILLING STATUS ================= */

  const loadBillingStatus = useCallback(async () => {
    if (!user?.email) {
      setBillingChecked(true);
      return;
    }

    // ✅ VIP bypass
    if (vip) {
      if (user.hasAccess === false) updateUser({ hasAccess: true });

      if (isOwnerEmail(user.email) && user.planType !== "owner") {
        updateUser({ planType: "owner" });
      }

      setBillingChecked(true);
      return;
    }

    if (billingChecked) return;

    // ✅ DEV bypass
    if (import.meta.env.DEV) {
      if (user.hasAccess === false) updateUser({ hasAccess: true });
      setBillingChecked(true);
      return;
    }

    // ===== PROD =====

    try {
      const me = await axios.get("/users/me", {
        params: { email: user.email },
      });

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
      // fallback billing/status
    }

    try {
      const res = await axios.get("/billing/status");

      const serverHasAccess =
        typeof res.data?.hasAccess === "boolean"
          ? res.data.hasAccess
          : typeof res.data?.active === "boolean"
          ? res.data.active
          : true;

      const planTypeFromServer = res.data?.planType;

      if (isFreeLifetimePlan(planTypeFromServer)) {
        updateUser({
          hasAccess: true,
          planType: planTypeFromServer,
        });
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
    } catch {
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

  /* ================= UI ================= */

  return (
    <div className={`app ${user ? "appShell" : ""}`}>
      
      {/* ===== SIDEBAR ===== */}
      {user ? (
        <SidebarNav />
      ) : (
        <header className="site-header">
          <div className="site-header-logo-block">
            <img src={logo} alt="Rycus" className="site-header-logo" />
            <div className="site-header-title">Rycus</div>
            <div className="site-header-subtitle">
              Rate Your Customer US
            </div>
          </div>

          <nav className="site-header-nav">
            <Link to="/">🏠 Home</Link>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Create account</Link>
          </nav>
        </header>
      )}

      {/* ===== MAIN ===== */}
      {/* 🔥 IMPORTANTE: main + appMain */}
      <main className={user ? "main appMain" : "main"}>
        <Routes>

          {/* ===== PUBLIC ===== */}
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

          {/* ===== PRIVATE ===== */}

          <Route
            path="/home"
            element={
              <ProtectedRoute requireAccess={false}>
                <FeedPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireAccess={true}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* ===== BILLING ===== */}

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

          {/* ===== CUSTOMERS ===== */}

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

          {/* ===== USERS ===== */}

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

          {/* ===== PROFILE ===== */}

          <Route
            path="/profile"
            element={
              <ProtectedRoute requireAccess={false}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* ===== MESSAGES ===== */}

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

          {/* ===== FALLBACK ===== */}

          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </main>
    </div>
  );
}
