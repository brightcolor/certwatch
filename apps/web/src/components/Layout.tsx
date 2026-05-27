import { Activity, BarChart3, Bell, Boxes, Download, Moon, Plus, Settings, Sun, Upload, Users } from "lucide-react";

const navItems = [
  { page: "dashboard", label: "Dashboard", icon: Activity },
  { page: "applications", label: "Applications", icon: Boxes },
  { page: "settings", label: "Alerts", icon: Bell },
  { page: "operations", label: "Operations", icon: Settings },
  { page: "reports", label: "Reports", icon: BarChart3 },
  { page: "import", label: "Import", icon: Upload },
  { page: "users", label: "Users", icon: Users }
];

export function Layout({ children, page, onNew, theme, setTheme, onPage, version, uiTheme }: any) {
  if (uiTheme === "adminlte") return <AdminLteLayout children={children} page={page} onNew={onNew} theme={theme} setTheme={setTheme} onPage={onPage} version={version} />;
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><Activity size={24} /> <strong>CertWatch</strong></div>
        {navItems.map((item) => <NavButton key={item.page} item={item} active={page === item.page} onClick={() => onPage(item.page)} />)}
        <a className="navlink" href="/api/export/monitors.json"><Download size={16} /> Export</a>
        <small className="muted">v{version ?? "0.0.0"}</small>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <span className="eyebrow">Selfhosted TLS monitoring</span>
            <h1>{titleFor(page)}</h1>
          </div>
          <div className="actions">
            <button className="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle theme">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={onNew}><Plus size={16} /> Monitor</button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function AdminLteLayout({ children, page, onNew, theme, setTheme, onPage, version }: any) {
  return (
    <div className="app-wrapper certwatch-adminlte">
      <nav className="app-header navbar navbar-expand bg-body">
        <div className="container-fluid">
          <ul className="navbar-nav">
            <li className="nav-item"><button className="nav-link" type="button" onClick={() => onPage("dashboard")}><Activity size={18} /> CertWatch</button></li>
          </ul>
          <ul className="navbar-nav ms-auto align-items-center gap-2">
            <li className="nav-item"><span className="nav-link text-secondary">v{version ?? "0.0.0"}</span></li>
            <li className="nav-item"><button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle color mode">{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button></li>
            <li className="nav-item"><button className="btn btn-primary btn-sm" type="button" onClick={onNew}><Plus size={16} /> Monitor</button></li>
          </ul>
        </div>
      </nav>
      <aside className="app-sidebar bg-body-secondary shadow" data-bs-theme={theme === "dark" ? "dark" : "light"}>
        <div className="sidebar-brand">
          <button className="brand-link" type="button" onClick={() => onPage("dashboard")}>
            <span className="brand-image"><Activity size={18} /></span>
            <span className="brand-text fw-semibold">CertWatch</span>
          </button>
        </div>
        <div className="sidebar-wrapper">
          <nav className="mt-2">
            <ul className="nav sidebar-menu flex-column" role="navigation" aria-label="Main navigation">
              {navItems.map((item) => <AdminNavItem key={item.page} item={item} active={page === item.page} onClick={() => onPage(item.page)} />)}
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
              <div>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item"><button className="btn btn-link p-0" type="button" onClick={() => onPage("dashboard")}>Home</button></li>
                  <li className="breadcrumb-item active" aria-current="page">{titleFor(page)}</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
        <div className="app-content">
          <div className="container-fluid">{children}</div>
        </div>
      </main>
    </div>
  );
}

function NavButton({ item, active, onClick }: any) {
  const Icon = item.icon;
  return <button className={active ? "active" : ""} onClick={onClick}>{item.page !== "dashboard" && <Icon size={16} />}{item.label}</button>;
}

function AdminNavItem({ item, active, onClick }: any) {
  const Icon = item.icon;
  return <li className="nav-item"><button type="button" className={`nav-link${active ? " active" : ""}`} onClick={onClick}><Icon className="nav-icon" size={18} /><p>{item.label}</p></button></li>;
}

const titleFor = (page: string) => ({
  settings: "Notification Channels",
  operations: "Operations",
  reports: "Reports",
  users: "Users",
  import: "Bulk Import",
  applications: "Applications"
}[page] ?? "Certificate Operations");
