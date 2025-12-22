// src/App.tsx
import React from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import "./App.css";

import logo from "./assets/rycus-logo.png";
import { useAuth } from "./context/AuthContext";

// Páginas
import HomePage from "./HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import DashboardPage from "./pages/DashboardPage";
import CustomerCreate from "./pages/CustomerCreate";
import CustomerList from "./pages/CustomerList";
import CustomerReviewsPage from "./pages/CustomerReviewsPage";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, initializing } = useAuth();

  // Mientras restauramos sesión desde localStorage
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

function App() {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <header className="site-header">
        <div className="site-header-logo-block">
          <img src={logo} alt="Rycus logo" className="site-logo" />
          <div className="site-subtitle">Rate Your Customer US</div>
        </div>

        <nav className="site-nav">
          <Link to="/" className="nav-btn">
            <span className="nav-icon">🏠</span>
            Home
          </Link>

          {!user && (
            <>
              <Link to="/login" className="nav-btn">
                <span className="nav-icon">🔐</span>
                Sign In
              </Link>
              <Link to="/register" className="nav-btn">
                <span className="nav-icon">📝</span>
                Sign Up
              </Link>
            </>
          )}

          {user && (
            <>
              <Link to="/dashboard" className="nav-btn">
                <span className="nav-icon">📊</span>
                Dashboard
              </Link>
              <Link to="/profile" className="nav-btn">
                <span className="nav-icon">👤</span>
                Profile
              </Link>
              <button
                type="button"
                className="nav-btn logout-btn"
                onClick={logout}
              >
                <span className="nav-icon">🚪</span>
                Logout
              </button>
            </>
          )}
        </nav>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
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

          <Route
            path="/customers/new"
            element={
              <ProtectedRoute>
                <CustomerCreate />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <CustomerList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers/:id/reviews"
            element={
              <ProtectedRoute>
                <CustomerReviewsPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
