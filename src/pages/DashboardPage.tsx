// src/pages/DashboardPage.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import CustomerMap from "../components/CustomerMap"; // 🔹 Mapa

type Review = {
  id: number;
  ratingOverall?: number;
  ratingPayment?: number;
  ratingBehavior?: number;
  ratingCommunication?: number;
  comment?: string;
  createdAt?: string;
  createdBy?: string;
};

interface DashboardStats {
  totalCustomers: number;
  pendingReviews: number;
  completedReviews: number;
  averageRating: number;
}

const EMPTY_STATS: DashboardStats = {
  totalCustomers: 0,
  pendingReviews: 0,
  completedReviews: 0,
  averageRating: 0,
};

type MilestoneProgress = {
  milestoneType: string;
  qualifiedCustomers: number;
  timesAwarded: number;
  nextRewardAt: number;
  remaining: number;
};

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  // ✅ Milestone UI states
  const [milestone, setMilestone] = useState<MilestoneProgress | null>(null);
  const [milestoneLoading, setMilestoneLoading] = useState(false);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);

        const userEmail = user?.email?.trim();
        const userName = (user?.name || "").trim();

        if (!userEmail) {
          setStats(EMPTY_STATS);
          return;
        }

        // 1) My Customers (solo los del usuario)
        const customersRes = await axios.get("/customers", {
          params: { userEmail },
        });

        const customers: any[] = customersRes.data ?? [];
        const totalCustomers = customers.length;

        // Si no hay clientes, es un estado válido
        if (totalCustomers === 0) {
          setStats(EMPTY_STATS);
          return;
        }

        const customerIds: number[] = customers
          .map((c) => c.id)
          .filter((id: any) => id != null);

        // 2) Reviews por customer (sin tumbar todo si falla uno)
        const results = await Promise.allSettled(
          customerIds.map((id) =>
            axios.get<Review[]>(`/customers/${id}/reviews`).then((r) => r.data ?? [])
          )
        );

        const reviewsByCustomer = new Map<number, Review[]>();

        results.forEach((res, index) => {
          const customerId = customerIds[index];
          if (res.status === "fulfilled") {
            reviewsByCustomer.set(customerId, res.value);
          } else {
            console.warn(
              `Failed loading reviews for customer ${customerId}`,
              res.reason
            );
            reviewsByCustomer.set(customerId, []);
          }
        });

        // 3) Métricas

        // 3a) Clientes que tienen AL MENOS UN review (de cualquiera)
        const customersWithAnyReview = new Set<number>();

        // 3b) Clientes que yo ya revieweé + mis reviews
        const customersReviewedByMe = new Set<number>();
        const myReviews: Review[] = [];

        const userEmailLower = userEmail.toLowerCase();
        const userNameLower = userName.toLowerCase();

        reviewsByCustomer.forEach((reviews, customerId) => {
          const list = reviews ?? [];

          if (list.length > 0) {
            customersWithAnyReview.add(customerId);
          }

          const mine = list.filter((r) => {
            const createdBy = (r.createdBy ?? "").trim().toLowerCase();
            return (
              (userEmailLower && createdBy === userEmailLower) ||
              (userNameLower && createdBy === userNameLower)
            );
          });

          if (mine.length > 0) {
            customersReviewedByMe.add(customerId);
            myReviews.push(...mine);
          }
        });

        // 🔹 Pendientes = clientes míos que YO todavía no he revieweado
        let pendingReviews = totalCustomers - customersReviewedByMe.size;
        if (pendingReviews < 0) pendingReviews = 0;

        // 🔹 CompletedReviews = cantidad de reviews que yo he enviado
        const completedReviews = myReviews.length;

        // AverageRating sobre mis reviews (si no hay, 0)
        let averageRating = 0;
        if (completedReviews > 0) {
          const sum = myReviews.reduce((acc, r) => {
            const value = (r.ratingOverall ?? r.ratingPayment ?? 0) as number;
            return acc + value;
          }, 0);
          averageRating = sum / completedReviews;
        }

        setStats({
          totalCustomers,
          pendingReviews,
          completedReviews,
          averageRating,
        });
      } catch (err) {
        console.error("Error loading dashboard stats", err);
        setStats(EMPTY_STATS);
      } finally {
        setLoading(false);
      }
    };

    const loadMilestone = async () => {
      try {
        if (!user?.email) {
          setMilestone(null);
          return;
        }

        setMilestoneLoading(true);
        setMilestoneError(null);

        // ✅ ÚNICO endpoint real (backend saca el usuario del JWT)
        const res = await axios.get("/dashboard/milestone");
        setMilestone(res.data ?? null);
      } catch (e: any) {
        console.error("Error loading milestone", e);
        setMilestoneError(
          e?.response?.data?.message ?? "Failed to load rewards progress"
        );
        setMilestone(null);
      } finally {
        setMilestoneLoading(false);
      }
    };

    loadStats();
    loadMilestone();
  }, [user?.email, user?.name]);

  const { totalCustomers, pendingReviews, completedReviews, averageRating } =
    stats;

  // ✅ DISPLAY NAME: primero nombre real, luego fallback a email
  const firstName = (user?.firstName || "").trim();
  const fullName = (user?.name || "").trim(); // si tu backend lo llena
  const emailPrefix = user?.email ? user.email.split("@")[0] : "User";

  const displayName =
    (firstName && firstName) ||
    (fullName && fullName.split(" ")[0]) ||
    emailPrefix;

  const initial = (firstName || fullName || user?.email || "U")
    .charAt(0)
    .toUpperCase();

  // ✅ Milestone derived values (safe)
  const nextRewardAt = milestone?.nextRewardAt ?? 10;
  const qualified = milestone?.qualifiedCustomers ?? 0;
  const remaining =
    milestone?.remaining ?? Math.max(nextRewardAt - qualified, 0);
  const progressPct =
    nextRewardAt > 0
      ? Math.min(100, Math.floor((qualified * 100) / nextRewardAt))
      : 0;

  return (
    <div className="page dashboard-container">
      <div className="dashboard-user-header">
        <div className="dashboard-user-photo">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={displayName}
              className="dashboard-user-photo-img"
            />
          ) : (
            initial
          )}
        </div>
        <div>
          <h1 className="dashboard-user-name">Welcome, {displayName}!</h1>
          <p className="dashboard-subtitle">
            Quick overview of your activity on Rycus.
          </p>
        </div>
      </div>

      <h2>Dashboard</h2>

      {loading && <p>Loading data...</p>}

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h2>My Customers</h2>
          <div className="dashboard-number">{loading ? "…" : totalCustomers}</div>
          <p className="dashboard-text">Active customers added by you.</p>
          <Link to="/customers" className="dashboard-link">
            View customers
          </Link>
        </div>

        <div className="dashboard-card">
          <h2>Pending Reviews</h2>
          <div className="dashboard-number">{loading ? "…" : pendingReviews}</div>
          <p className="dashboard-text">Customers you haven&apos;t reviewed yet.</p>
          <Link to="/customers" className="dashboard-link">
            Rate now
          </Link>
        </div>

        <div className="dashboard-card">
          <h2>Completed Reviews</h2>
          <div className="dashboard-number">
            {loading ? "…" : completedReviews}
          </div>
          <p className="dashboard-text">Reviews you have already submitted.</p>
          <Link to="/customers" className="dashboard-link">
            See reviews
          </Link>
        </div>

        <div className="dashboard-card">
          <h2>Average Rating</h2>
          <div className="dashboard-number">
            {loading ? "…" : averageRating ? averageRating.toFixed(1) : "0.0"}
          </div>
          <p className="dashboard-text">Your overall customer rating score.</p>
        </div>

        {/* ✅ Milestone / Rewards progress card */}
        <div className="dashboard-card">
          <h2>🏆 Rewards Progress</h2>

          <div className="dashboard-number">
            {milestoneLoading ? "…" : `${qualified} / ${nextRewardAt}`}
          </div>

          <p className="dashboard-text">
            {milestoneLoading && "Loading milestone…"}
            {!milestoneLoading && milestoneError && milestoneError}
            {!milestoneLoading && !milestoneError && (
              <>
                Milestone: <strong>10 new customers reviewed</strong>.
                <br />
                Only <strong>{remaining}</strong> more to earn{" "}
                <strong>1 free month</strong> 🎉
              </>
            )}
          </p>

          {/* progress bar */}
          <div
            style={{
              height: 10,
              background: "#f3f4f6",
              borderRadius: 999,
              overflow: "hidden",
              marginTop: 10,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background: "#111827",
                borderRadius: 999,
                transition: "width 300ms ease",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "#6b7280",
            }}
          >
            <span>0</span>
            <span>{progressPct}%</span>
            <span>{nextRewardAt}</span>
          </div>

          <Link
            to="/customers/new"
            className="dashboard-link"
            style={{ marginTop: 10, display: "inline-block" }}
          >
            + Add a customer to progress
          </Link>
        </div>

        <div className="dashboard-card">
          <h2>Search Global Customers</h2>
          <div className="dashboard-number">🔎</div>
          <p className="dashboard-text">
            Find customers already reviewed in Rycus using any information you
            have: first name, last name, email, phone number, city, state, ZIP
            code, address, customer type or tags. When you leave a review for
            one of them, that customer will automatically be added to your
            &quot;My Customers&quot; list.
          </p>
          <Link to="/customers" className="dashboard-link">
            Search global customers
          </Link>
        </div>
      </div>

      <h2 className="dashboard-actions-title">Quick Actions</h2>
      <div className="dashboard-actions">
        <Link to="/customers/new" className="dashboard-btn">
          + Add New Customer
        </Link>

        <Link to="/customers" className="dashboard-btn">
          View All Customers
        </Link>

        <Link to="/profile" className="dashboard-btn">
          Edit My Profile
        </Link>
      </div>

      {/* 🔹 Sección del mapa en el Dashboard */}
      <section style={{ marginTop: "32px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
          Customers Map
        </h2>
        <p
          style={{
            color: "#4b5563",
            fontSize: "14px",
            marginBottom: "12px",
            maxWidth: "640px",
          }}
        >
          See all customers with a valid address on the map. Each pin represents
          one customer based on their address, city, state and ZIP code.
        </p>

        <div className="card">
          <CustomerMap />
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
