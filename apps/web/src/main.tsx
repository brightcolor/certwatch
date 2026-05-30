import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { api, Monitor, CheckResult, Incident, StatusSubscription, TenantGroup, TenantInvite, TenantMembership, UserAlertSettings } from "./api/client";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { FrontPage } from "./pages/FrontPage";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { MonitorDetail } from "./pages/MonitorDetail";
import { MonitorForm } from "./pages/MonitorForm";
import { Settings } from "./pages/Settings";
import { BulkImport } from "./pages/BulkImport";
import { UsersPage } from "./pages/Users";
import { Applications } from "./pages/Applications";
import { Operations } from "./pages/Operations";
import { Reports } from "./pages/Reports";
import { TenantsPage } from "./pages/Tenants";
import { useLiveRefresh } from "./hooks/useLiveRefresh";
import { applyStatusFavicon } from "./utils/favicon";
import "./styles/app.css";

const initialThemeMode = (() => {
  const stored = localStorage.getItem("themeMode") ?? localStorage.getItem("theme");
  if (stored === "auto" || stored === "dark" || stored === "bright") return stored;
  if (stored === "light") return "bright";
  return "dark";
})();

const resolveTheme = (mode: string) => {
  if (mode === "auto") return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  return mode === "bright" ? "light" : "dark";
};

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
  const [personalAlerts, setPersonalAlerts] = useState<UserAlertSettings | null>(null);
  const [ctWatch, setCtWatch] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<StatusSubscription[]>([]);
  const [tenants, setTenants] = useState<TenantMembership[]>([]);
  const [tenantMembers, setTenantMembers] = useState<any[]>([]);
  const [tenantInvites, setTenantInvites] = useState<TenantInvite[]>([]);
  const [tenantGroups, setTenantGroups] = useState<TenantGroup[]>([]);
  const [tenantId, setTenantId] = useState(localStorage.getItem("tenantId") ?? "");
  const [users, setUsers] = useState<any[]>([]);
  const [version, setVersion] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [editing, setEditing] = useState<Monitor | null | "new">(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState("dashboard");
  const [themeMode, setThemeMode] = useState(initialThemeMode);
  const [resolvedTheme, setResolvedTheme] = useState(resolveTheme(initialThemeMode));
  const [liveRefreshKey, setLiveRefreshKey] = useState(0);
  const [toast, setToast] = useState("");
  const [publicConfig, setPublicConfig] = useState({ frontPageEnabled: true, publicRegistrationEnabled: true });
  const [inviteToken] = useState(() => new URLSearchParams(window.location.search).get("invite"));
  const [authMode, setAuthMode] = useState<"front" | "login" | "register">(() => inviteToken ? "register" : "front");

  useEffect(() => {
    const apply = () => {
      const next = resolveTheme(themeMode);
      setResolvedTheme(next);
      document.documentElement.dataset.theme = next;
      document.documentElement.dataset.bsTheme = next;
      document.documentElement.dataset.themeMode = themeMode;
    };
    apply();
    localStorage.setItem("themeMode", themeMode);
    localStorage.setItem("theme", themeMode === "bright" ? "light" : themeMode);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [themeMode]);
  useEffect(() => {
    api.request<any>("/auth/config")
      .then((status) => {
        setPublicConfig({
          frontPageEnabled: Boolean(status.frontPageEnabled),
          publicRegistrationEnabled: Boolean(status.publicRegistrationEnabled)
        });
        setSetupRequired(status.setupRequired);
        if (status.setupRequired) {
          setAuthMode("login");
          return null;
        }
        return api.request<any>("/auth/me").then((r) => { api.setCsrf(r.csrfToken); applyTenants(r.tenants ?? []); setUser(r.user); });
      })
      .catch(() => setUser(null))
      .finally(() => setBooted(true));
  }, []);
  useEffect(() => { if (user && tenantId) void refresh(); }, [user, tenantId]);
  useEffect(() => { if (selected) void loadMonitorData(selected); }, [selected]);
  useEffect(() => applyStatusFavicon(stats), [stats]);
  useEffect(() => {
    if (!user) return;
    if (!window.history.state?.crtwatch) window.history.replaceState({ crtwatch: true, page: "dashboard", selected: null }, "");
    const onPopState = () => {
      const state = window.history.state?.crtwatch ? window.history.state : { page: "dashboard", selected: null };
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
    setPersonalAlerts(await api.request<UserAlertSettings>("/me/alert-settings"));
    setVersion((await api.request<any>("/version")).version);
    setTenants(await api.request<TenantMembership[]>("/tenants"));
    await loadTenantMembers();
    if (user?.role === "admin") setUsers(await api.request<any[]>("/users"));
  };

  const refreshOverview = async () => {
    const [monitorData, statusData] = await Promise.all([
      api.request<Monitor[]>("/monitors"),
      api.request<any>("/status")
    ]);
    setMonitors(monitorData);
    setStats(statusData);
  };

  const applyTenants = (items: TenantMembership[]) => {
    setTenants(items);
    const existing = localStorage.getItem("tenantId");
    const selected = items.find((item) => item.tenantId === existing)?.tenantId ?? items[0]?.tenantId ?? "";
    if (selected) {
      api.setTenant(selected);
      setTenantId(selected);
    }
  };

  const switchTenant = (nextTenantId: string) => {
    api.setTenant(nextTenantId);
    setTenantId(nextTenantId);
    navigate("dashboard");
  };

  const loadTenantMembers = async () => {
    const id = localStorage.getItem("tenantId");
    if (!id) {
      setTenantMembers([]);
      setTenantGroups([]);
      return setTenantInvites([]);
    }
    try {
      const [members, invites, groups] = await Promise.all([
        api.request<any[]>(`/tenants/${id}/members`),
        api.request<TenantInvite[]>(`/tenants/${id}/invites`),
        api.request<TenantGroup[]>(`/tenants/${id}/groups`)
      ]);
      setTenantMembers(members);
      setTenantInvites(invites);
      setTenantGroups(groups);
    } catch {
      setTenantMembers([]);
      setTenantInvites([]);
      setTenantGroups([]);
    }
  };

  const loadMonitorData = async (id: string) => {
    const [resultData, incidentData] = await Promise.all([
      api.request<CheckResult[]>(`/monitors/${id}/results`),
      api.request<Incident[]>(`/monitors/${id}/incidents`)
    ]);
    setResults(resultData);
    setIncidents(incidentData);
  };

  useLiveRefresh({
    active: Boolean(user && tenantId),
    paused: Boolean(editing),
    page,
    selected,
    refresh,
    refreshOverview,
    loadMonitorData,
    onTick: () => setLiveRefreshKey((current) => current + 1)
  });

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
  const cloneMonitor = async (id: string) => {
    const cloned = await api.request<Monitor>(`/monitors/${id}/clone`, { method: "POST", body: "{}" });
    await refresh();
    navigate("dashboard", cloned.id);
    setToast("Monitor cloned as paused");
  };
  const navigate = (nextPage: string, nextSelected: string | null = null) => {
    setPage(nextPage);
    setSelected(nextSelected);
    if (!nextSelected) {
      setResults([]);
      setIncidents([]);
    }
    window.history.pushState({ crtwatch: true, page: nextPage, selected: nextSelected }, "");
  };
  const backToOverview = () => {
    if (window.history.state?.crtwatch && window.history.state.selected) window.history.back();
    else navigate("dashboard");
  };
  const finishLogin = (result: any) => {
    applyTenants(result.tenants ?? []);
    setUser(result.user);
    setSetupRequired(false);
    if (inviteToken) window.history.replaceState(window.history.state, "", window.location.pathname);
  };

  if (!booted) return <main className="login"><div className="login-panel"><span className="eyebrow">crt.watch</span><h1>Loading</h1></div></main>;
  if (!user && setupRequired) return <Login setupRequired registrationEnabled={false} onLogin={finishLogin} />;
  if (!user && authMode === "register") return <Register inviteToken={inviteToken} onBack={() => setAuthMode("login")} onLogin={finishLogin} />;
  if (!user && publicConfig.frontPageEnabled && authMode === "front") {
    return <FrontPage setupRequired={setupRequired} registrationEnabled={publicConfig.publicRegistrationEnabled} onAuth={() => setAuthMode("login")} onRegister={() => setAuthMode("register")} />;
  }
  if (!user) {
    return <Login
      setupRequired={false}
      registrationEnabled={publicConfig.publicRegistrationEnabled}
      onBack={publicConfig.frontPageEnabled ? () => setAuthMode("front") : undefined}
      onRegister={() => setAuthMode("register")}
      onLogin={finishLogin}
    />;
  }
  const selectedMonitor = monitors.find((monitor) => monitor.id === selected);

  return (
    <Layout
      page={page}
      onPage={(nextPage: string) => navigate(nextPage)}
      onNew={() => setEditing("new")}
      theme={resolvedTheme}
      themeMode={themeMode}
      setThemeMode={setThemeMode}
      version={version}
      stats={stats}
      monitors={monitors}
      onSelectMonitor={(id: string) => navigate("dashboard", id)}
      tenants={tenants}
      tenantId={tenantId}
      onTenant={switchTenant}
    >
      {toast && <div className="toast" onAnimationEnd={() => setToast("")}>{toast}</div>}
      {page === "settings" ? (
        <Settings
          channels={channels}
          alerting={alerting}
          smtp={smtp}
          retention={retention}
          routes={routes}
          personalAlerts={personalAlerts}
          ctWatch={ctWatch}
          subscriptions={subscriptions}
          theme={themeMode}
          setTheme={setThemeMode}
          onSaveChannel={async (channel: any) => { await api.request("/notification-channels", { method: "POST", body: JSON.stringify(channel) }); await refresh(); }}
          onDeleteChannel={async (id: string) => { await api.request(`/notification-channels/${id}`, { method: "DELETE" }); await refresh(); }}
          onTest={(id: string) => api.request("/notification-channels/test", { method: "POST", body: JSON.stringify({ id }) })}
          onSaveAlerting={async (data: any) => { await api.request("/settings/alerting", { method: "PUT", body: JSON.stringify(data) }); await refresh(); }}
          onSaveSmtp={async (data: any) => { await api.request("/settings/smtp", { method: "PUT", body: JSON.stringify(data) }); await refresh(); }}
          onSaveRetention={async (data: any) => { await api.request("/settings/retention", { method: "PUT", body: JSON.stringify(data) }); await refresh(); }}
          onSaveRoutes={async (data: any) => { await api.request("/notification-routes", { method: "PUT", body: JSON.stringify(data) }); await refresh(); }}
          onSavePersonalAlerts={async (data: any) => { const saved = await api.request<UserAlertSettings>("/me/alert-settings", { method: "PUT", body: JSON.stringify(data) }); setPersonalAlerts(saved); }}
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
        <UsersPage users={users} onCreate={async (data: any) => { await api.request("/users", { method: "POST", body: JSON.stringify(data) }); await refresh(); }} onUpdate={async (id: string, data: any) => { await api.request(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }); await refresh(); }} onDelete={async (id: string) => { await api.request(`/users/${id}`, { method: "DELETE" }); await refresh(); }} />
      ) : page === "tenants" ? (
        <TenantsPage
          tenants={tenants}
          members={tenantMembers}
          invites={tenantInvites}
          groups={tenantGroups}
          onCreateTenant={async (name) => { const created = await api.request<any>("/tenants", { method: "POST", body: JSON.stringify({ name }) }); api.setTenant(created.tenantId); setTenantId(created.tenantId); await refresh(); }}
          onInviteMember={async (email, role) => { const result = await api.request<any>(`/tenants/${tenantId}/invites`, { method: "POST", body: JSON.stringify({ email, role }) }); await loadTenantMembers(); return result.invite ?? null; }}
          onUpdateMember={async (userId, data) => { await api.request(`/tenants/${tenantId}/members/${userId}`, { method: "PUT", body: JSON.stringify(data) }); await loadTenantMembers(); }}
          onRemoveMember={async (userId) => { await api.request(`/tenants/${tenantId}/members/${userId}`, { method: "DELETE" }); await loadTenantMembers(); }}
          onDeleteInvite={async (inviteId) => { await api.request(`/tenants/${tenantId}/invites/${inviteId}`, { method: "DELETE" }); await loadTenantMembers(); }}
          onSaveGroup={async (group) => { await api.request(group.id ? `/tenants/${tenantId}/groups/${group.id}` : `/tenants/${tenantId}/groups`, { method: group.id ? "PUT" : "POST", body: JSON.stringify(group) }); await loadTenantMembers(); }}
          onDeleteGroup={async (groupId) => { await api.request(`/tenants/${tenantId}/groups/${groupId}`, { method: "DELETE" }); await loadTenantMembers(); }}
        />
      ) : page === "applications" ? (
        <Applications monitors={monitors} onSelect={(id) => navigate("dashboard", id)} />
      ) : page === "operations" ? (
        <Operations liveRefreshKey={liveRefreshKey} />
      ) : page === "reports" ? (
        <Reports liveRefreshKey={liveRefreshKey} />
      ) : selectedMonitor ? (
        <MonitorDetail
          monitor={selectedMonitor}
          results={results}
          incidents={incidents}
          onBack={backToOverview}
          onEdit={() => setEditing(selectedMonitor)}
          onCheck={() => checkNow(selectedMonitor.id)}
          onClone={() => cloneMonitor(selectedMonitor.id)}
          onDelete={() => deleteMonitor(selectedMonitor.id)}
          onAck={async (id: string, assignee: string) => { await api.request(`/incidents/${id}/ack`, { method: "POST", body: JSON.stringify({ assignee }) }); await loadMonitorData(selectedMonitor.id); }}
          onNote={async (id: string, text: string) => { await api.request(`/incidents/${id}/notes`, { method: "POST", body: JSON.stringify({ text }) }); await loadMonitorData(selectedMonitor.id); }}
        />
      ) : (
        <Dashboard monitors={monitors} stats={stats} query={query} setQuery={setQuery} onSelect={(id: string) => navigate("dashboard", id)} onCheck={checkNow} onClone={cloneMonitor} />
      )}
      {editing && <MonitorForm channels={channels} monitor={editing === "new" ? null : editing} onCancel={() => setEditing(null)} onSave={saveMonitor} onSaveAndCheck={saveAndCheck} />}
    </Layout>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
