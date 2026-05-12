import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { useAuth } from "./context/AuthContext";
import axios from "./api/axiosClient";

import "./App.css";

import { OWNER_EMAILS } from "./config/owners";

import SidebarNav from "./components/SidebarNav";

import HomePage from "./HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import SupportPage from "./pages/SupportPage";

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

import ActivatePage from "./pages/ActivatePage";
import BillingSuccessPage from "./pages/BillingSuccessPage";
import BillingCancelPage from "./pages/BillingCancelPage";

import AdminDashboardPage from "./pages/AdminDashboardPage";

import logo from "./assets/rycus-logo-check.png";

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
    return <Navigate to="/activate" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();

  if (initializing) return <div className="page">Loading...</div>;
  if (user) return <Navigate to="/home" replace />;

  return <>{children}</>;
}

export default function App() {
  const { user, updateUser } = useAuth();
  const vip = isVipUser(user);
  const isNativeApp = Capacitor.getPlatform() !== "web";

  const [billingChecked, setBillingChecked] = useState(false);

  useEffect(() => {
    const openDeepLink = (url: string, source: "launch" | "event") => {
      if (!url) return;

      const lastUrl = sessionStorage.getItem("rycus_last_deep_link");

      if (source === "launch" && lastUrl === url) {
        console.log("🔁 Launch deep link already handled:", url);
        return;
      }

      sessionStorage.setItem("rycus_last_deep_link", url);

      console.log("🔗 Deep link received:", url, "source:", source);

      if (url.includes("billing/success")) {
        window.history.replaceState({}, "", "/billing/success");
        window.dispatchEvent(new PopStateEvent("popstate"));
        return;
      }

      if (url.includes("billing/cancel")) {
        window.history.replaceState({}, "", "/billing/cancel");
        window.dispatchEvent(new PopStateEvent("popstate"));
        return;
      }

      if (url.includes("activate")) {
        window.history.replaceState({}, "", "/activate");
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    };

    CapacitorApp.getLaunchUrl().then((result) => {
      const url = result?.url || "";

      if (url) {
        openDeepLink(url, "launch");
      }
    });

    const listener = CapacitorApp.addListener("appUrlOpen", (data) => {
      const url = data?.url || "";

      if (url) {
        openDeepLink(url, "event");
      }
    });

    return () => {
      void listener.then((h) => h.remove());
    };
  }, []);

  const loadBillingStatus = useCallback(async () => {
    if (!user?.email) {
      setBillingChecked(true);
      return;
    }

    if (vip) {
      if (user.hasAccess === false) updateUser({ hasAccess: true });

      if (isOwnerEmail(user.email) && user.planType !== "owner") {
        updateUser({ planType: "owner" });
      }

      setBillingChecked(true);
      return;
    }

    if (billingChecked) return;

    if (import.meta.env.DEV) {
      if (user.hasAccess === false) updateUser({ hasAccess: true });
      setBillingChecked(true);
      return;
    }

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

  useEffect(() => {
    if (isNativeApp) {
      document.documentElement.classList.add("native-map-page");
      document.body.classList.add("native-map-page");
    } else {
      document.documentElement.classList.remove("native-map-page");
      document.body.classList.remove("native-map-page");
    }

    return () => {
      document.documentElement.classList.remove("native-map-page");
      document.body.classList.remove("native-map-page");
    };
  }, [isNativeApp]);

  if (user && !billingChecked) {
    return <div className="page">Checking subscription…</div>;
  }

  return (
    <div
      className={`app ${user ? "appShell" : ""} ${
        isNativeApp ? "native-map-page-shell" : ""
      }`}
      style={isNativeApp ? { background: "#ffffff" } : undefined}
    >
      {user ? (
        <SidebarNav />
      ) : (
        <header className="site-header">
          <div className="site-header-logo-block">
            <img src={logo} alt="Rycus" className="site-header-logo" />
            <div className="site-header-title">Rycus</div>
            <div className="site-header-subtitle">Rate Your Customer US</div>
          </div>

          <nav className="site-header-nav">
            <Link to="/">🏠 Home</Link>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Create account</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/support">Support</Link>
          </nav>
        </header>
      )}

      <main
        className={user ? "main appMain" : "main"}
        style={isNativeApp ? { background: "#ffffff" } : undefined}
      >
        <Routes>
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

          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/support" element={<SupportPage />} />

          <Route
            path="/home"
            element={
              <ProtectedRoute requireAccess={true}>
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

          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAccess={false}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

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
              <ProtectedRoute requireAccess={false}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}