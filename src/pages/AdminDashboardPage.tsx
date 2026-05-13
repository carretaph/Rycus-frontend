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
  accountStatus?: string | null;
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
  if (v.includes("suspended")) return "admin-badge admin-badge-orange";
  if (v.includes("banned")) return "admin-badge admin-badge-red";
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
  const [accountFilter, setAccountFilter] = useState("ALL");
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

  const availableAccountStatuses = useMemo(() => {
    return [
      "ALL",
      ...Array.from(
        new Set(
          users
            .map((u) => clean(u.accountStatus || "ACTIVE").toUpperCase())
            .filter(Boolean)
        )
      ),
    ];
  }, [users]);

  const updateAccountStatus = async (
    userId: number,
    status: "ACTIVE" | "SUSPENDED" | "BANNED"
  ) => {
    const label =
      status === "ACTIVE"
        ? "reactivate"
        : status === "SUSPENDED"
        ? "suspend"
        : "ban";

    const ok = window.confirm(`Are you sure you want to ${label} this user?`);

    if (!ok) return;

    try {
      const res = await axios.patch<AdminUser>(
        `/admin/users/${userId}/status`,
        null,
        {
          params: { status },
        }
      );

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? res.data : u))
      );
    } catch (e) {
      console.error(e);
      alert(`Could not ${label} user.`);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();

    return users.filter((u) => {
      const accountStatus = clean(u.accountStatus || "ACTIVE");

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
        accountStatus,
        u.createdAt,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !q || haystack.includes(q);

      const matchesRole =
        roleFilter === "ALL" || clean(u.role).toUpperCase() === roleFilter;

      const matchesPlan =
        planFilter === "ALL" ||
        clean(u.planType).toUpperCase() === planFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        clean(u.subscriptionStatus).toUpperCase() === statusFilter;

      const matchesAccount =
        accountFilter === "ALL" ||
        accountStatus.toUpperCase() === accountFilter;

      return (
        matchesQuery &&
        matchesRole &&
        matchesPlan &&
        matchesStatus &&
        matchesAccount
      );
    });
  }, [users, query, roleFilter, planFilter, statusFilter, accountFilter]);

  const suspendedOrBannedUsers = users.filter((u) => {
    const status = clean(u.accountStatus || "ACTIVE").toUpperCase();
    return status === "SUSPENDED" || status === "BANNED";
  }).length;

  return (
    <div className="page">
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <p className="admin-eyebrow">RYCUS CONTROL CENTER</p>

            <h1>Admin Dashboard</h1>

            <p>
              Monitor users, plans, profile data, referral fee activity,
              subscriptions and moderation status from one place.
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
            <span>Moderated Accounts</span>
            <strong>{suspendedOrBannedUsers}</strong>
            <small>Suspended or banned</small>
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
                  {status === "ALL" ? "All subscription" : status}
                </option>
              ))}
            </select>

            <select
              className="admin-select"
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
            >
              {availableAccountStatuses.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL" ? "All accounts" : status}
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
                  <th>Subscription</th>
                  <th>Account</th>
                  <th>Referral</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((u) => {
                  const accountStatus = clean(
                    u.accountStatus || "ACTIVE"
                  ).toUpperCase();

                  return (
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
                        <span className={badgeClass(accountStatus)}>
                          {accountStatus}
                        </span>
                      </td>

                      <td>
                        {u.offersReferralFee ? (
                          <span className="admin-badge admin-badge-green">
                            Yes
                          </span>
                        ) : (
                          <span className="admin-badge">No</span>
                        )}
                      </td>

                      <td>
                        <details className="admin-actions-dropdown">
                          <summary className="admin-actions-trigger">
                          <span>Actions</span>
                          <span>▾</span>
                          </summary>

                          <div className="admin-actions-menu">
                            <Link
                              to={`/users/${u.id}`}
                              className="admin-dropdown-item"
                            >
                              View
                            </Link>

                            {accountStatus !== "SUSPENDED" && (
                              <button
                                type="button"
                                className="admin-dropdown-item admin-warning-btn"
                                onClick={() =>
                                  updateAccountStatus(u.id, "SUSPENDED")
                                }
                              >
                                Suspend
                              </button>
                            )}

                            {accountStatus !== "BANNED" && (
                              <button
                                type="button"
                                className="admin-dropdown-item admin-danger-btn"
                                onClick={() =>
                                  updateAccountStatus(u.id, "BANNED")
                                }
                              >
                                Ban
                              </button>
                            )}

                            {accountStatus !== "ACTIVE" && (
                              <button
                                type="button"
                                className="admin-dropdown-item admin-success-btn"
                                onClick={() =>
                                  updateAccountStatus(u.id, "ACTIVE")
                                }
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={11} className="admin-empty">
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