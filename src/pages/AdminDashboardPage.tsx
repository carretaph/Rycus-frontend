import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axiosClient";

type AdminStats = {
  totalUsers: number;
  adminUsers: number;
  usersWithReferralFee: number;
};

type AdminUser = {
  id: number;
  fullName?: string | null;
  email?: string | null;
  role?: string | null;
  businessName?: string | null;
  industry?: string | null;
  city?: string | null;
  state?: string | null;
  offersReferralFee?: boolean;
  planType?: string | null;
  subscriptionStatus?: string | null;
  createdAt?: string | null;
};

function clean(value?: string | null) {
  return (value || "").trim();
}

function badgeClass(value?: string | null) {
  const v = clean(value).toLowerCase();

  if (v.includes("active")) return "admin-badge admin-badge-green";
  if (v.includes("admin")) return "admin-badge admin-badge-blue";
  if (v.includes("lifetime")) return "admin-badge admin-badge-purple";
  if (v.includes("trial")) return "admin-badge admin-badge-gray";
  if (v.includes("past_due")) return "admin-badge admin-badge-orange";
  if (v.includes("cancel")) return "admin-badge admin-badge-red";

  return "admin-badge";
}

function formatDate(date?: string | null) {
  if (!date) return "—";

  try {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAdmin() {
      try {
        setError(null);

        const [statsRes, usersRes] = await Promise.all([
          axios.get<AdminStats>("/admin/stats"),
          axios.get<AdminUser[]>("/admin/users"),
        ]);

        setStats(statsRes.data);
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      } catch (e) {
        console.error("admin load error", e);
        setError("Could not load admin dashboard.");
      }
    }

    void loadAdmin();
  }, []);

  const availablePlans = useMemo(() => {
    return [
      "ALL",
      ...Array.from(
        new Set(
          users
            .map((u) => clean(u.planType).toUpperCase())
            .filter(Boolean)
        )
      ),
    ];
  }, [users]);

  const availableStatuses = useMemo(() => {
    return [
      "ALL",
      ...Array.from(
        new Set(
          users
            .map((u) => clean(u.subscriptionStatus).toUpperCase())
            .filter(Boolean)
        )
      ),
    ];
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();

    return users.filter((u) => {
      const haystack = [
        u.fullName,
        u.email,
        u.businessName,
        u.industry,
        u.city,
        u.state,
        u.planType,
        u.subscriptionStatus,
        u.role,
        u.createdAt,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !q || haystack.includes(q);

      const matchesRole =
        roleFilter === "ALL" ||
        clean(u.role).toUpperCase() === roleFilter;

      const matchesPlan =
        planFilter === "ALL" ||
        clean(u.planType).toUpperCase() === planFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        clean(u.subscriptionStatus).toUpperCase() === statusFilter;

      return (
        matchesQuery &&
        matchesRole &&
        matchesPlan &&
        matchesStatus
      );
    });
  }, [users, query, roleFilter, planFilter, statusFilter]);

  const activeUsers = users.filter((u) => {
    const status = clean(u.subscriptionStatus).toLowerCase();

    return (
      status === "active" ||
      status === "trialing" ||
      status === "paid"
    );
  }).length;

  return (
    <div className="page">
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <p className="admin-eyebrow">RYCUS CONTROL CENTER</p>

            <h1>Admin Dashboard</h1>

            <p>
              Monitor users, plans, profile data, referral fee activity and
              account status from one place.
            </p>
          </div>

          <Link to="/dashboard" className="dashboard-link">
            ← Back to Dashboard
          </Link>
        </div>

        {error && <div className="users-error">{error}</div>}

        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <span>Total Users</span>
            <strong>{stats?.totalUsers ?? "—"}</strong>
            <small>Registered accounts</small>
          </div>

          <div className="admin-stat-card">
            <span>Admin Users</span>
            <strong>{stats?.adminUsers ?? "—"}</strong>
            <small>Internal access</small>
          </div>

          <div className="admin-stat-card">
            <span>Referral Fee Users</span>
            <strong>{stats?.usersWithReferralFee ?? "—"}</strong>
            <small>Offering referral payouts</small>
          </div>

          <div className="admin-stat-card">
            <span>Active Subscriptions</span>
            <strong>{activeUsers}</strong>
            <small>Marked active</small>
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Users</h2>

              <p>
                Showing {filteredUsers.length} of {users.length} users.
              </p>
            </div>
          </div>

          <div className="admin-toolbar">
            <input
              className="admin-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users, email, business, city, state..."
            />

            <select
              className="admin-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">All roles</option>
              <option value="ADMIN">Admin</option>
              <option value="USER">User</option>
            </select>

            <select
              className="admin-select"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
            >
              {availablePlans.map((plan) => (
                <option key={plan} value={plan}>
                  {plan === "ALL" ? "All plans" : plan}
                </option>
              ))}
            </select>

            <select
              className="admin-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL" ? "All status" : status}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Business</th>
                  <th>Industry</th>
                  <th>Location</th>
                  <th>Registered</th>
                  <th>Role</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Referral</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="admin-user-cell">
                        <strong>{u.fullName || "Unknown"}</strong>
                        <span>{u.email || "—"}</span>
                      </div>
                    </td>

                    <td>{u.businessName || "—"}</td>

                    <td>{u.industry || "—"}</td>

                    <td>
                      {[u.city, u.state].filter(Boolean).join(", ") || "—"}
                    </td>

                    <td>{formatDate(u.createdAt)}</td>

                    <td>
                      <span className={badgeClass(u.role)}>
                        {u.role || "USER"}
                      </span>
                    </td>

                    <td>
                      <span className={badgeClass(u.planType)}>
                        {u.planType || "—"}
                      </span>
                    </td>

                    <td>
                      <span className={badgeClass(u.subscriptionStatus)}>
                        {u.subscriptionStatus || "—"}
                      </span>
                    </td>

                    <td>
                      {u.offersReferralFee ? (
                        <span className="admin-badge admin-badge-green">
                          Yes
                        </span>
                      ) : (
                        <span className="admin-badge">
                          No
                        </span>
                      )}
                    </td>

                    <td>
                      <Link
                        to={`/users/${u.id}`}
                        className="admin-link-btn"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={10} className="admin-empty">
                      No users match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;