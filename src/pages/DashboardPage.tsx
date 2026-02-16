// src/pages/DashboardPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import CustomerMap from "../components/CustomerMap";

type Review = {
  id: number;
  customerId?: number;
  customerName?: string;
  ratingOverall?: number;
  ratingPayment?: number;
  ratingBehavior?: number;
  ratingCommunication?: number;
  comment?: string;
  createdAt?: string;
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

function getAuthToken(): string | null {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("rycus_token") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("rycus_token") ||
    sessionStorage.getItem("authToken")
  );
}

/** ErrorBoundary local para que CustomerMap NO tumbe toda la página */
class SafeBlock extends React.Component<
  { title?: string; children: React.ReactNode },
  { hasError: boolean; msg?: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, msg: undefined };
  }
  static getDerivedStateFromError(err: any) {
    return { hasError: true, msg: String(err?.message || err) };
  }
  componentDidCatch(err: any) {
    console.error("SafeBlock error:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="dashboard-card" style={{ padding: 16 }}>
          <strong>{this.props.title ?? "Section error"}</strong>
          <div style={{ marginTop: 8, color: "#b91c1c" }}>
            {this.state.msg || "Something failed to render."}
          </div>
        </div>
      );
    }
    return <>{this.props.children}</>;
  }
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  const [milestone, setMilestone] = useState<MilestoneProgress | null>(null);
  const [milestoneLoading, setMilestoneLoading] = useState(false);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);

  const displayName = useMemo(() => {
    const fn = user?.firstName?.trim();
    if (fn) return fn;
    return user?.email || "User";
  }, [user?.firstName, user?.email]);

  const initials = useMemo(() => {
    const fn = user?.firstName?.trim();
    const ln = (user as any)?.lastName?.trim?.();
    const src = fn || user?.email || "U";
    if (fn && ln) return `${fn[0]}${ln[0]}`.toUpperCase();
    return (src[0] || "U").toUpperCase();
  }, [user?.firstName, user?.email]);

  const avatarUrl = (user as any)?.photoUrl || (user as any)?.avatarUrl || "";

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
            axios
              .get<Review[]>(`/customers/${id}/reviews`, {
                params: { userEmail: email },
              })
              .then((r) => r.data ?? [])
          )
        );

        const reviewedCustomers = new Set<number>();
        const myReviews: Review[] = [];

        results.forEach((res, idx) => {
          const customerId = customerIds[idx];
          if (res.status !== "fulfilled") return;

          const reviews = res.value ?? [];
          if (reviews.length > 0) {
            reviewedCustomers.add(customerId);
            myReviews.push(...reviews);
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

        const token = getAuthToken();
        if (!token) {
          setMilestone(null);
          return;
        }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const qualified = milestone?.qualifiedCustomers ?? 0;
  const nextRewardAt = milestone?.nextRewardAt ?? 10;
  const remaining = milestone?.remaining ?? Math.max(nextRewardAt - qualified, 0);

  const progressPct =
    nextRewardAt > 0
      ? Math.min(100, Math.floor((qualified * 100) / nextRewardAt))
      : 0;

  const avgText = loading
    ? "…"
    : stats.averageRating
    ? stats.averageRating.toFixed(1)
    : "0.0";

  return (
    <div className="page">
      <div className="dashboard-container">
        {/* HEADER */}
        <div className="dashboard-user-header">
          <div className="dashboard-user-photo" aria-label="User avatar">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="dashboard-user-photo-img"
              />
            ) : (
              <span style={{ fontWeight: 800, color: "#334155" }}>{initials}</span>
            )}
          </div>

          <div className="dashboard-user-meta" style={{ flex: 1 }}>
            <h1>Welcome, {displayName}!</h1>
            <p>{loading ? "Loading your dashboard…" : "Here’s your latest activity."}</p>
          </div>
        </div>

        {/* GRID */}
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h2>My Customers</h2>
            <div className="dashboard-number">
              {loading ? "…" : stats.totalCustomers}
            </div>
            <p className="dashboard-text">Active customers added by you.</p>
            <Link to="/customers" className="dashboard-link">
              View customers
            </Link>
          </div>

          <div className="dashboard-card">
            <h2>Pending Reviews</h2>
            <div className="dashboard-number">
              {loading ? "…" : stats.pendingReviews}
            </div>
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

          {/* ✅ Igualamos altura con “link fantasma” */}
          <div className="dashboard-card">
            <h2>Average Rating</h2>
            <div
              className="dashboard-number"
              style={{
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
              }}
            >
              {avgText}
            </div>
            <p className="dashboard-text">Your overall customer rating score.</p>

            {/* reserva el mismo espacio que las otras cards (pero invisible) */}
            <span className="dashboard-link dashboard-link--ghost">See reviews</span>
          </div>

          {/* Rewards */}
          <div className="dashboard-card dashboard-card--rewards">
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

            <div className="dashboard-progress">
              <div
                className="dashboard-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="dashboard-progress-meta">
              <span>{qualified} reviewed</span>
              <span>{nextRewardAt} goal</span>
            </div>

            <Link to="/customers/new" className="dashboard-link">
              + Add a customer to progress
            </Link>
          </div>
        </div>

        {/* MAP */}
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
            one customer.
          </p>

          <div className="dashboard-map-wrap">
            <SafeBlock title="Map failed to render">
              <div className="dashboard-map-card">
                <CustomerMap />
              </div>
            </SafeBlock>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
