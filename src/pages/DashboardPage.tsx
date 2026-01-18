// src/pages/DashboardPage.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import CustomerMap from "../components/CustomerMap";

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

type MilestoneProgress = {
  milestoneType: string;
  qualifiedCustomers: number;
  timesAwarded: number;
  nextRewardAt: number;
  remaining: number;
};

const EMPTY_STATS: DashboardStats = {
  totalCustomers: 0,
  pendingReviews: 0,
  completedReviews: 0,
  averageRating: 0,
};

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  const [milestone, setMilestone] = useState<MilestoneProgress | null>(null);
  const [milestoneLoading, setMilestoneLoading] = useState(false);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);

        const email = user?.email?.trim();
        if (!email) {
          setStats(EMPTY_STATS);
          return;
        }

        const customersRes = await axios.get("/customers", {
          params: { userEmail: email },
        });

        const customers: any[] = customersRes.data ?? [];
        const totalCustomers = customers.length;

        if (totalCustomers === 0) {
          setStats(EMPTY_STATS);
          return;
        }

        const customerIds: number[] = customers.map((c) => c?.id).filter(Boolean);

        const results = await Promise.allSettled(
          customerIds.map((id) =>
            axios.get<Review[]>(`/customers/${id}/reviews`).then((r) => r.data ?? [])
          )
        );

        const reviewedCustomers = new Set<number>();
        const myReviews: Review[] = [];

        results.forEach((res, idx) => {
          const customerId = customerIds[idx];
          if (res.status !== "fulfilled") return;

          const reviews = res.value ?? [];
          const mine = reviews.filter((r) => {
            const createdBy = (r.createdBy ?? "").trim().toLowerCase();
            return createdBy === email.toLowerCase();
          });

          if (mine.length > 0) {
            reviewedCustomers.add(customerId);
            myReviews.push(...mine);
          }
        });

        let pendingReviews = totalCustomers - reviewedCustomers.size;
        if (pendingReviews < 0) pendingReviews = 0;

        const completedReviews = myReviews.length;

        const averageRating =
          completedReviews === 0
            ? 0
            : myReviews.reduce((acc, r) => acc + (r.ratingOverall ?? 0), 0) /
              completedReviews;

        setStats({
          totalCustomers,
          pendingReviews,
          completedReviews,
          averageRating,
        });
      } catch (e) {
        console.error("Error loading dashboard stats", e);
        setStats(EMPTY_STATS);
      } finally {
        setLoading(false);
      }
    };

    const loadMilestone = async () => {
      try {
        setMilestoneLoading(true);
        setMilestoneError(null);

        // ✅ Evita 401 “fantasma” si aún no hay sesión/token en el cliente
        // (asumiendo que guardas el JWT en localStorage como "token")
        const token = localStorage.getItem("token");
        if (!token) {
          setMilestone(null);
          return;
        }

        // ✅ ÚNICO endpoint válido (backend saca el usuario del JWT)
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

    // ✅ IMPORTANTE: en prod a veces user/email no “cambia” y el useEffect no corre.
    // Por eso cargamos 1 vez al montar y listo.
    loadStats();
    loadMilestone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const qualified = milestone?.qualifiedCustomers ?? 0;
  const nextRewardAt = milestone?.nextRewardAt ?? 10;
  const remaining = milestone?.remaining ?? Math.max(nextRewardAt - qualified, 0);
  const progressPct =
    nextRewardAt > 0
      ? Math.min(100, Math.floor((qualified * 100) / nextRewardAt))
      : 0;

  return (
    <div className="page dashboard-container">
      {/* Header simple */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <h1 style={{ margin: 0 }}>
          Welcome, {user?.firstName?.trim() || user?.email || "User"}!
        </h1>
        {loading && <span style={{ color: "#6b7280" }}>Loading…</span>}
      </div>

      <h2>Dashboard</h2>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h2>My Customers</h2>
          <div className="dashboard-number">{loading ? "…" : stats.totalCustomers}</div>
          <p className="dashboard-text">Active customers added by you.</p>
          <Link to="/customers" className="dashboard-link">
            View customers
          </Link>
        </div>

        <div className="dashboard-card">
          <h2>Pending Reviews</h2>
          <div className="dashboard-number">{loading ? "…" : stats.pendingReviews}</div>
          <p className="dashboard-text">Customers you haven&apos;t reviewed yet.</p>
          <Link to="/customers" className="dashboard-link">
            Rate now
          </Link>
        </div>

        <div className="dashboard-card">
          <h2>Completed Reviews</h2>
          <div className="dashboard-number">
            {loading ? "…" : stats.completedReviews}
          </div>
          <p className="dashboard-text">Reviews you have already submitted.</p>
          <Link to="/customers" className="dashboard-link">
            See reviews
          </Link>
        </div>

        <div className="dashboard-card">
          <h2>Average Rating</h2>
          <div className="dashboard-number">
            {loading ? "…" : stats.averageRating ? stats.averageRating.toFixed(1) : "0.0"}
          </div>
          <p className="dashboard-text">Your overall customer rating score.</p>
        </div>

        <div className="dashboard-card">
          <h2>🏆 Rewards Progress</h2>

          <div className="dashboard-number">
            {milestoneLoading ? "…" : `${qualified} / ${nextRewardAt}`}
          </div>

          <p className="dashboard-text">
            {milestoneLoading && "Loading rewards…"}
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
                transition: "width 250ms ease",
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
      </div>

      {/* Map section */}
      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          Customers Map
        </h2>
        <p
          style={{
            color: "#4b5563",
            fontSize: 14,
            marginBottom: 12,
            maxWidth: 640,
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
