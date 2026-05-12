import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { api, Monitor, CheckResult } from "./api/client";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { MonitorDetail } from "./pages/MonitorDetail";
import { MonitorForm } from "./pages/MonitorForm";
import { Settings } from "./pages/Settings";
import "./styles/app.css";

function App() {
  const [user, setUser] = useState<any>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [stats, setStats] = useState<any>({});
  const [channels, setChannels] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [editing, setEditing] = useState<Monitor | null | "new">(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState("dashboard");
  const [theme, setTheme] = useState(localStorage.getItem("theme") ?? "dark");
  const [toast, setToast] = useState("");

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("theme", theme); }, [theme]);
  useEffect(() => { api.request<any>("/auth/me").then((r) => { api.setCsrf(r.csrfToken); setUser(r.user); }).catch(() => setUser(null)); }, []);
  useEffect(() => { if (user) void refresh(); }, [user]);
  useEffect(() => { if (selected) void loadResults(selected); }, [selected]);

  const refresh = async () => {
    const [monitorData, statusData, channelData] = await Promise.all([
      api.request<Monitor[]>("/monitors"),
      api.request<any>("/status"),
      api.request<any[]>("/notification-channels")
    ]);
    setMonitors(monitorData);
    setStats(statusData);
    setChannels(channelData);
  };

  const loadResults = async (id: string) => setResults(await api.request<CheckResult[]>(`/monitors/${id}/results`));
  const saveMonitor = async (data: any) => {
    const path = editing && editing !== "new" ? `/monitors/${editing.id}` : "/monitors";
    const method = editing && editing !== "new" ? "PUT" : "POST";
    await api.request(path, { method, body: JSON.stringify(data) });
    setEditing(null);
    await refresh();
  };
  const saveAndCheck = async (data: any) => {
    const created = await api.request<Monitor>(editing && editing !== "new" ? `/monitors/${editing.id}` : "/monitors", { method: editing && editing !== "new" ? "PUT" : "POST", body: JSON.stringify(data) });
    await checkNow(created.id);
    setEditing(null);
  };
  const checkNow = async (id: string) => {
    setToast("Check started");
    await api.request(`/monitors/${id}/check`, { method: "POST", body: "{}" });
    await refresh();
    if (selected === id) await loadResults(id);
    setToast("Check completed");
  };

  if (!user) return <Login onLogin={setUser} />;
  const selectedMonitor = monitors.find((monitor) => monitor.id === selected);

  return (
    <Layout page={page} onPage={setPage} onNew={() => setEditing("new")} theme={theme} setTheme={setTheme}>
      {toast && <div className="toast" onAnimationEnd={() => setToast("")}>{toast}</div>}
      {page === "settings" ? (
        <Settings channels={channels} onSave={async (channel: any) => { await api.request("/notification-channels", { method: "POST", body: JSON.stringify(channel) }); await refresh(); }} onTest={(id: string) => api.request("/notification-channels/test", { method: "POST", body: JSON.stringify({ id }) })} />
      ) : selectedMonitor ? (
        <MonitorDetail monitor={selectedMonitor} results={results} onBack={() => setSelected(null)} onEdit={() => setEditing(selectedMonitor)} onCheck={() => checkNow(selectedMonitor.id)} />
      ) : (
        <Dashboard monitors={monitors} stats={stats} query={query} setQuery={setQuery} onSelect={setSelected} onCheck={checkNow} />
      )}
      {editing && <MonitorForm monitor={editing === "new" ? null : editing} onCancel={() => setEditing(null)} onSave={saveMonitor} onSaveAndCheck={saveAndCheck} />}
    </Layout>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
