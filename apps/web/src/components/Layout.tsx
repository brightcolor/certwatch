import { Activity, BarChart3, Bell, Boxes, Download, Moon, Plus, Settings, Sun, Upload, Users } from "lucide-react";

export function Layout({ children, page, onNew, theme, setTheme, onPage, version }: any) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><Activity size={24} /> <strong>CertWatch</strong></div>
        <button className={page === "dashboard" ? "active" : ""} onClick={() => onPage("dashboard")}>Dashboard</button>
        <button className={page === "applications" ? "active" : ""} onClick={() => onPage("applications")}><Boxes size={16} /> Applications</button>
        <button className={page === "settings" ? "active" : ""} onClick={() => onPage("settings")}><Bell size={16} /> Alerts</button>
        <button className={page === "operations" ? "active" : ""} onClick={() => onPage("operations")}><Settings size={16} /> Operations</button>
        <button className={page === "reports" ? "active" : ""} onClick={() => onPage("reports")}><BarChart3 size={16} /> Reports</button>
        <button className={page === "import" ? "active" : ""} onClick={() => onPage("import")}><Upload size={16} /> Import</button>
        <button className={page === "users" ? "active" : ""} onClick={() => onPage("users")}><Users size={16} /> Users</button>
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

const titleFor = (page: string) => ({
  settings: "Notification Channels",
  operations: "Operations",
  reports: "Reports",
  users: "Users",
  import: "Bulk Import",
  applications: "Applications"
}[page] ?? "Certificate Operations");
