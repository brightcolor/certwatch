import { useMemo, useState } from "react";
import { Activity, BarChart3, Bell, Boxes, Download, Menu, Plus, Search, Settings, Users, Upload } from "lucide-react";
import type { Monitor } from "../api/client";

const navItems = [
  { page: "dashboard", label: "Dashboard", icon: Activity },
  { page: "applications", label: "Applications", icon: Boxes },
  { page: "settings", label: "Alerts", icon: Bell },
  { page: "operations", label: "Operations", icon: Settings },
  { page: "reports", label: "Reports", icon: BarChart3 },
  { page: "import", label: "Import", icon: Upload },
  { page: "tenants", label: "Workspaces", icon: Boxes },
  { page: "users", label: "Users", icon: Users }
];

export function Layout({ children, page, onNew, theme, themeMode, setThemeMode, onPage, version, stats = {}, monitors = [], onSelectMonitor, tenants = [], tenantId, onTenant }: any) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [search, setSearch] = useState("");
  const critical = (stats.critical ?? 0) + (stats.down ?? 0);
  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return monitors
      .filter((monitor: Monitor) => [monitor.name, monitor.host, monitor.type, monitor.tags.join(" ")].join(" ").toLowerCase().includes(term))
      .slice(0, 8);
  }, [monitors, search]);

  const navigate = (nextPage: string) => {
    setSidebarOpen(false);
    onPage(nextPage);
  };
  const jumpToMonitor = (id: string) => {
    setSearch("");
    onSelectMonitor?.(id);
  };

  return (
    <div className={`app-wrapper layout-fixed sidebar-expand-lg certwatch-adminlte${sidebarOpen ? " sidebar-open" : ""}`}>
      {sidebarOpen && <button className="sidebar-backdrop" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <nav className="app-header navbar navbar-expand bg-body border-bottom">
        <div className="container-fluid gap-2">
          <button className="nav-link sidebar-toggle" type="button" aria-label="Toggle navigation" onClick={() => setSidebarOpen((current) => !current)}>
            <Menu size={20} />
          </button>
          <button className="nav-link product-link" type="button" onClick={() => navigate("dashboard")}>
            <Activity size={18} />
            <span>CertWatch</span>
          </button>
          <form className="header-search" onSubmit={(event) => { event.preventDefault(); if (matches[0]) jumpToMonitor(matches[0].id); }}>
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Jump to monitor, host, or label" />
            {!!matches.length && (
              <div className="header-search-results list-group">
                {matches.map((monitor: Monitor) => (
                  <button className="list-group-item list-group-item-action" type="button" key={monitor.id} onClick={() => jumpToMonitor(monitor.id)}>
                    <strong>{monitor.name}</strong>
                    <span>{monitor.host}:{monitor.port} - {monitor.lastStatus}</span>
                  </button>
                ))}
              </div>
            )}
          </form>
          <div className="navbar-nav ms-auto align-items-center gap-2">
            {tenants.length > 1 && <select className="form-select form-select-sm tenant-select" value={tenantId ?? ""} onChange={(event) => onTenant?.(event.target.value)} aria-label="Workspace">
              {tenants.map((item: any) => <option key={item.tenantId} value={item.tenantId}>{item.tenant.name}</option>)}
            </select>}
            <div className="nav-item status-dropdown">
              <button className="btn btn-outline-secondary btn-sm position-relative" type="button" onClick={() => setStatusOpen((current) => !current)} aria-expanded={statusOpen}>
                <Bell size={16} />
                {critical > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-danger">{critical}</span>}
              </button>
              {statusOpen && <StatusMenu stats={stats} onPage={navigate} />}
            </div>
            <select className="form-select form-select-sm theme-select" value={themeMode ?? "dark"} onChange={(event) => setThemeMode?.(event.target.value)} aria-label="Color mode" title="Color mode">
              <option value="dark">Dark</option>
              <option value="bright">Bright</option>
              <option value="auto">Auto</option>
            </select>
            <button className="btn btn-primary btn-sm" type="button" onClick={onNew}><Plus size={16} /> Monitor</button>
          </div>
        </div>
      </nav>
      <aside className="app-sidebar bg-body-secondary shadow" data-bs-theme={theme === "dark" ? "dark" : "light"}>
        <div className="sidebar-brand">
          <button className="brand-link" type="button" onClick={() => navigate("dashboard")}>
            <span className="brand-image"><Activity size={18} /></span>
            <span className="brand-text fw-semibold">CertWatch</span>
          </button>
        </div>
        <div className="sidebar-wrapper">
          <nav className="mt-2">
            <ul className="nav sidebar-menu flex-column" role="navigation" aria-label="Main navigation">
              {navItems.map((item) => <NavItem key={item.page} item={item} active={page === item.page} stats={stats} onClick={() => navigate(item.page)} />)}
              <li className="nav-item"><a className="nav-link" href="/api/export/monitors.json"><Download className="nav-icon" size={18} /><p>Export</p></a></li>
            </ul>
          </nav>
        </div>
      </aside>
      <main className="app-main">
        <div className="app-content-header">
          <div className="container-fluid">
            <div className="adminlte-titlebar">
              <div>
                <span className="eyebrow">Selfhosted TLS monitoring</span>
                <h1>{titleFor(page)}</h1>
              </div>
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item"><button className="btn btn-link p-0" type="button" onClick={() => navigate("dashboard")}>Home</button></li>
                <li className="breadcrumb-item active" aria-current="page">{titleFor(page)}</li>
              </ol>
            </div>
          </div>
        </div>
        <div className="app-content"><div className="container-fluid">{children}</div></div>
      </main>
      <footer className="app-footer"><span>CertWatch v{version || "0.0.0"}</span><span className="ms-auto">Vibecoded with human review.</span></footer>
    </div>
  );
}

function NavItem({ item, active, stats, onClick }: any) {
  const Icon = item.icon;
  const badge = navBadge(item.page, stats);
  return (
    <li className="nav-item">
      <button type="button" className={`nav-link${active ? " active" : ""}`} onClick={onClick}>
        <Icon className="nav-icon" size={18} />
        <p>{item.label}{badge && <span className={`nav-badge ${badge.className}`}>{badge.value}</span>}</p>
      </button>
    </li>
  );
}

function StatusMenu({ stats, onPage }: any) {
  const critical = (stats.critical ?? 0) + (stats.down ?? 0);
  return (
    <div className="status-menu card shadow">
      <div className="card-header"><strong>Operations status</strong></div>
      <div className="list-group list-group-flush">
        <StatusRow label="Healthy" value={stats.ok ?? 0} tone="success" />
        <StatusRow label="Warning" value={stats.warning ?? 0} tone="warning" />
        <StatusRow label="Critical or down" value={critical} tone="danger" />
        <StatusRow label="Paused" value={stats.paused ?? 0} tone="secondary" />
      </div>
      <div className="card-footer d-flex gap-2">
        <button className="btn btn-sm btn-primary" type="button" onClick={() => onPage("dashboard")}>Open dashboard</button>
        <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => onPage("reports")}>Reports</button>
      </div>
    </div>
  );
}

function StatusRow({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="list-group-item d-flex align-items-center justify-content-between"><span>{label}</span><span className={`badge text-bg-${tone}`}>{value}</span></div>;
}

const navBadge = (page: string, stats: any) => {
  if (page === "dashboard") {
    const critical = (stats.critical ?? 0) + (stats.down ?? 0);
    if (critical) return { value: critical, className: "danger" };
    if (stats.warning) return { value: stats.warning, className: "warning" };
  }
  return null;
};

const titleFor = (page: string) => ({
  dashboard: "Dashboard",
  settings: "Notification Channels",
  operations: "Operations",
  reports: "Reports",
  users: "Users",
  tenants: "Workspaces",
  import: "Bulk Import",
  applications: "Applications"
}[page] ?? "Dashboard");
