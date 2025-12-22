// src/pages/DashboardPage.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

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

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

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
            axios
              .get<Review[]>(`/customers/${id}/reviews`)
              .then((r) => r.data ?? [])
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

        // 3b) Reviews hechos por mí (creados por mí)
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
            const createdBy = (r.createdBy ?? "").toLowerCase();
            return (
              createdBy === userEmailLower ||
              (userNameLower && createdBy === userNameLower)
            );
          });

          if (mine.length > 0) {
            customersReviewedByMe.add(customerId);
            myReviews.push(...mine);
          }
        });

        // Clientes pendientes = total clientes - clientes que ya tienen AL MENOS UN review
        const pendingReviews = totalCustomers - customersWithAnyReview.size;

        // CompletedReviews = cantidad de reviews míos
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

    loadStats();
  }, [user?.email, user?.name]);

  const { totalCustomers, pendingReviews, completedReviews, averageRating } =
    stats;

  const displayName =
    (user?.name && user.name.split(" ")[0]) ||
    (user?.email ? user.email.split("@")[0] : "User");

  const initial = (user?.name || user?.email || "U")
    .charAt(0)
    .toUpperCase();

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
          <div className="dashboard-number">
            {loading ? "…" : totalCustomers}
          </div>
          <p className="dashboard-text">Active customers added by you.</p>
          <Link to="/customers" className="dashboard-link">
            View customers
          </Link>
        </div>

        <div className="dashboard-card">
          <h2>Pending Reviews</h2>
          <div className="dashboard-number">
            {loading ? "…" : pendingReviews}
          </div>
          <p className="dashboard-text">
            Customers that don&apos;t have any review yet.
          </p>
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

        <div className="dashboard-card">
          <h2>Search Global Customers</h2>
          <div className="dashboard-number">🔎</div>
          <p className="dashboard-text">
            Find customers already reviewed in Rycus by name, ZIP, email, or
            phone. If you leave a review, they will be added to your customers.
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
    </div>
  );
};

export default DashboardPage;
