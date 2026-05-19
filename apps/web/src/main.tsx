import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { api, Monitor, CheckResult, Incident, StatusSubscription } from "./api/client";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { MonitorDetail } from "./pages/MonitorDetail";
import { MonitorForm } from "./pages/MonitorForm";
import { Settings } from "./pages/Settings";
import { BulkImport } from "./pages/BulkImport";
import { UsersPage } from "./pages/Users";
import { Applications } from "./pages/Applications";
import { Operations } from "./pages/Operations";
import { Reports } from "./pages/Reports";
import { applyStatusFavicon } from "./utils/favicon";
import "./styles/app.css";

function App() {
  const [user, setUser] = useState<any>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [booted, setBooted] = useState(false);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [stats, setStats] = useState<any>({});
  const [channels, setChannels] = useState<any[]>([]);
  const [alerting, setAlerting] = useState<any>(null);
  const [smtp, setSmtp] = useState<any>(null);
  const [retention, setRetention] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [ctWatch, setCtWatch] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<StatusSubscription[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [version, setVersion] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [editing, setEditing] = useState<Monitor | null | "new">(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState("dashboard");
  const [theme, setTheme] = useState(localStorage.getItem("theme") ?? "dark");
  const [toast, setToast] = useState("");

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("theme", theme); }, [theme]);
  useEffect(() => {
    api.request<any>("/auth/setup-status")
      .then((status) => {
        setSetupRequired(status.setupRequired);
        if (status.setupRequired) return null;
        return api.request<any>("/auth/me").then((r) => { api.setCsrf(r.csrfToken); setUser(r.user); });
      })
      .catch(() => setUser(null))
      .finally(() => setBooted(true));
  }, []);
  useEffect(() => { if (user) void refresh(); }, [user]);
  useEffect(() => { if (selected) void loadMonitorData(selected); }, [selected]);
  useEffect(() => applyStatusFavicon(stats), [stats]);
  useEffect(() => {
    if (!user) return;
    if (!window.history.state?.certwatch) window.history.replaceState({ certwatch: true, page: "dashboard", selected: null }, "");
    const onPopState = () => {
      const state = window.history.state?.certwatch ? window.history.state : { page: "dashboard", selected: null };
      setPage(state.page ?? "dashboard");
      setSelected(state.selected ?? null);
      if (!state.selected) {
        setResults([]);
        setIncidents([]);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [user]);
  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(() => {
      void api.request<any>("/status").then(setStats).catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [user]);

  const refresh = async () => {
    const [monitorData, statusData, channelData] = await Promise.all([
      api.request<Monitor[]>("/monitors"),
      api.request<any>("/status"),
      api.request<any[]>("/notification-channels")
    ]);
    const [alertingData, smtpData, retentionData, routesData, ctWatchData, subscriptionData] = await Promise.all([
      api.request<any>("/settings/alerting"),
      api.request<any>("/settings/smtp"),
      api.request<any>("/settings/retention"),
      api.request<any[]>("/notification-routes"),
      api.request<any>("/settings/ct-watch"),
      api.request<StatusSubscription[]>("/subscriptions")
    ]);
    setMonitors(monitorData);
    setStats(statusData);
    setChannels(channelData);
    setAlerting(alertingData);
    setSmtp(smtpData);
    setRetention(retentionData);
    setRoutes(routesData);
    setCtWatch(ctWatchData);
    setSubscriptions(subscriptionData);
    setVersion((await api.request<any>("/version")).version);
    if (user?.role === "admin") setUsers(await api.request<any[]>("/users"));
  };

  const loadMonitorData = async (id: string) => {
    const [resultData, incidentData] = await Promise.all([
      api.request<CheckResult[]>(`/monitors/${id}/results`),
      api.request<Incident[]>(`/monitors/${id}/incidents`)
    ]);
    setResults(resultData);
    setIncidents(incidentData);
  };
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
    if (selected === id) await loadMonitorData(id);
    setToast("Check completed");
  };
  const deleteMonitor = async (id: string) => {
    await api.request(`/monitors/${id}`, { method: "DELETE" });
    navigate("dashboard");
    await refresh();
    setToast("Monitor deleted");
  };
  const navigate = (nextPage: string, nextSelected: string | null = null) => {
    setPage(nextPage);
    setSelected(nextSelected);
    if (!nextSelected) {
      setResults([]);
      setIncidents([]);
    }
    window.history.pushState({ certwatch: true, page: nextPage, selected: nextSelected }, "");
  };
  const backToOverview = () => {
    if (window.history.state?.certwatch && window.history.state.selected) window.history.back();
    else navigate("dashboard");
  };

  if (!booted) return <main className="login"><div className="login-panel"><span className="eyebrow">CertWatch</span><h1>Loading</h1></div></main>;
  if (!user) return <Login setupRequired={setupRequired} onLogin={(nextUser) => { setUser(nextUser); setSetupRequired(false); }} />;
  const selectedMonitor = monitors.find((monitor) => monitor.id === selected);

  return (
    <Layout page={page} onPage={(nextPage: string) => navigate(nextPage)} onNew={() => setEditing("new")} theme={theme} setTheme={setTheme} version={version}>
      {toast && <div className="toast" onAnimationEnd={() => setToast("")}>{toast}</div>}
      {page === "settings" ? (
        <Settings
          channels={channels}
          alerting={alerting}
          smtp={smtp}
          retention={retention}
          routes={routes}
          ctWatch={ctWatch}
          subscriptions={subscriptions}
          onSaveChannel={async (channel: any) => { await api.request("/notification-channels", { method: "POST", body: JSON.stringify(channel) }); await refresh(); }}
          onDeleteChannel={async (id: string) => { await api.request(`/notification-channels/${id}`, { method: "DELETE" }); await refresh(); }}
          onTest={(id: string) => api.request("/notification-channels/test", { method: "POST", body: JSON.stringify({ id }) })}
          onSaveAlerting={async (data: any) => { await api.request("/settings/alerting", { method: "PUT", body: JSON.stringify(data) }); await refresh(); }}
          onSaveSmtp={async (data: any) => { await api.request("/settings/smtp", { method: "PUT", body: JSON.stringify(data) }); await refresh(); }}
          onSaveRetention={async (data: any) => { await api.request("/settings/retention", { method: "PUT", body: JSON.stringify(data) }); await refresh(); }}
          onSaveRoutes={async (data: any) => { await api.request("/notification-routes", { method: "PUT", body: JSON.stringify(data) }); await refresh(); }}
          onSaveCtWatch={async (data: any) => { await api.request("/settings/ct-watch", { method: "PUT", body: JSON.stringify(data) }); await refresh(); }}
          onCheckCtWatch={async () => api.request("/ct-watch/check", { method: "POST", body: "{}" })}
          onDeleteSubscription={async (id: string) => { await api.request(`/subscriptions/${id}`, { method: "DELETE" }); await refresh(); }}
        />
      ) : page === "import" ? (
        <BulkImport
          onImport={async (text) => { const result = await api.request("/monitors/bulk", { method: "POST", body: JSON.stringify({ text }) }); await refresh(); return result; }}
          onDiscover={async (domain: string) => api.request("/discover", { method: "POST", body: JSON.stringify({ domain }) })}
          onAcceptDiscovery={async (items: any[]) => { const result = await api.request("/discovery/import", { method: "POST", body: JSON.stringify({ monitors: items }) }); await refresh(); return result; }}
          onRestore={async (backup: any) => { const result = await api.request("/export/restore", { method: "POST", body: JSON.stringify(backup) }); await refresh(); return result; }}
        />
      ) : page === "users" ? (
        <UsersPage users={users} onCreate={async (data: any) => { await api.request("/users", { method: "POST", body: JSON.stringify(data) }); await refresh(); }} onDelete={async (id: string) => { await api.request(`/users/${id}`, { method: "DELETE" }); await refresh(); }} />
      ) : page === "applications" ? (
        <Applications monitors={monitors} onSelect={(id) => navigate("dashboard", id)} />
      ) : page === "operations" ? (
        <Operations />
      ) : page === "reports" ? (
        <Reports />
      ) : selectedMonitor ? (
        <MonitorDetail
          monitor={selectedMonitor}
          results={results}
          incidents={incidents}
          onBack={backToOverview}
          onEdit={() => setEditing(selectedMonitor)}
          onCheck={() => checkNow(selectedMonitor.id)}
          onDelete={() => deleteMonitor(selectedMonitor.id)}
          onAck={async (id: string, assignee: string) => { await api.request(`/incidents/${id}/ack`, { method: "POST", body: JSON.stringify({ assignee }) }); await loadMonitorData(selectedMonitor.id); }}
          onNote={async (id: string, text: string) => { await api.request(`/incidents/${id}/notes`, { method: "POST", body: JSON.stringify({ text }) }); await loadMonitorData(selectedMonitor.id); }}
        />
      ) : (
        <Dashboard monitors={monitors} stats={stats} query={query} setQuery={setQuery} onSelect={(id: string) => navigate("dashboard", id)} onCheck={checkNow} />
      )}
      {editing && <MonitorForm channels={channels} monitor={editing === "new" ? null : editing} onCancel={() => setEditing(null)} onSave={saveMonitor} onSaveAndCheck={saveAndCheck} />}
    </Layout>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
