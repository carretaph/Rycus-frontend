import { Link, useLocation } from "react-router-dom";

type SidebarNavProps = {
  user: any;
  hasAccess: boolean;
  vip: boolean;
  navDisplayName: string;
  userInitial: string;
  avatarToShow: string;
  unreadCount: number;
  pendingConnectionsCount: number;
  logout: () => void;
};

function Badge({ value }: { value: number }) {
  return value > 0 ? <span className="sideBadge">{value}</span> : null;
}

export default function SidebarNav({
  user,
  hasAccess,
  vip,
  navDisplayName,
  userInitial,
  avatarToShow,
  unreadCount,
  pendingConnectionsCount,
  logout,
}: SidebarNavProps) {
  const { pathname } = useLocation();

  const isActive = (to: string) =>
    pathname === to || pathname.startsWith(to + "/");

  return (
    <aside className="side">
      <Link to="/home" className="sideBrand">
        <span className="sideBrandMark">☑️</span>
        <span className="sideBrandText">Rycus</span>
      </Link>

      <Link to="/profile" className="sideMe">
        <div className="sideAvatarRing">
          {avatarToShow ? (
            <img className="sideAvatar" src={avatarToShow} alt="avatar" />
          ) : (
            <div className="sideAvatar sideAvatarFallback">{userInitial}</div>
          )}
        </div>
        <div className="sideMeText">
          <div className="sideMeName">
            {navDisplayName}
            {user?.email && user?.planType && String(user.planType).toLowerCase() === "owner"
              ? " 👑"
              : ""}
            {user?.planType && String(user.planType).toUpperCase() === "FREE_LIFETIME"
              ? " ✅"
              : ""}
          </div>
          <div className="sideMeSub">{hasAccess ? "Active" : "Locked"}</div>
        </div>
      </Link>

      <nav className="sideNav">
        <Link className={`sideItem ${isActive("/home") ? "active" : ""}`} to="/home">
          <span className="sideIcon">🏠</span>
          <span className="sideLabel">Home</span>
          <span className="tip">Home</span>
        </Link>

        <Link className={`sideItem ${isActive("/dashboard") ? "active" : ""}`} to="/dashboard">
          <span className="sideIcon">📊</span>
          <span className="sideLabel">Dashboard</span>
          <span className="tip">Dashboard</span>
        </Link>

        {hasAccess && (
          <>
            <Link className={`sideItem ${isActive("/customers") ? "active" : ""}`} to="/customers">
              <span className="sideIcon">👥</span>
              <span className="sideLabel">Customers</span>
              <span className="tip">Customers</span>
            </Link>

            <Link
              className={`sideItem ${isActive("/connections") ? "active" : ""}`}
              to="/connections"
            >
              <span className="sideIcon">🤝</span>
              <span className="sideLabel">
                Network <Badge value={pendingConnectionsCount} />
              </span>
              <span className="tip">Network</span>
            </Link>

            <Link className={`sideItem ${isActive("/inbox") ? "active" : ""}`} to="/inbox">
              <span className="sideIcon">💬</span>
              <span className="sideLabel">
                Messages <Badge value={unreadCount} />
              </span>
              <span className="tip">Messages</span>
            </Link>

            <Link className={`sideItem ${isActive("/users") ? "active" : ""}`} to="/users">
              <span className="sideIcon">🙋‍♂️</span>
              <span className="sideLabel">Users</span>
              <span className="tip">Users</span>
            </Link>
          </>
        )}

        {!hasAccess && !vip && (
          <Link className={`sideItem ${isActive("/activate") ? "active" : ""}`} to="/activate">
            <span className="sideIcon">🔒</span>
            <span className="sideLabel">Activate</span>
            <span className="tip">Activate</span>
          </Link>
        )}

        <button className="sideItem danger" onClick={logout} type="button">
          <span className="sideIcon">🚪</span>
          <span className="sideLabel">Logout</span>
          <span className="tip">Logout</span>
        </button>
      </nav>
    </aside>
  );
}
