import { useEffect, useMemo, useState } from "react";
import { Bell, Mail, PlugZap, Trash2 } from "lucide-react";

const providerFields: Record<string, Array<{ key: string; label: string; type?: string; placeholder?: string }>> = {
  email: [{ key: "from", label: "Sender override", placeholder: "certwatch@example.com" }],
  webhook: [],
  discord: [],
  slack: [],
  teams: [],
  mattermost: [],
  pushover: [{ key: "apiToken", label: "API token", type: "password" }],
  telegram: [{ key: "botToken", label: "Bot token", type: "password" }],
  gotify: [],
  ntfy: [],
  matrix: [
    { key: "baseUrl", label: "Homeserver URL", placeholder: "https://matrix.example.com" },
    { key: "accessToken", label: "Access token", type: "password" }
  ],
  pagerduty: [{ key: "integrationKey", label: "Events API integration key", type: "password" }],
  opsgenie: [{ key: "apiKey", label: "API key", type: "password" }]
};

export function Settings(props: any) {
  const { channels, alerting, smtp, retention, routes, ctWatch, subscriptions } = props;
  const [channel, setChannel] = useState<any>({ name: "", type: "email", enabled: true, config: {} });
  const [alertForm, setAlertForm] = useState(alerting);
  const [smtpForm, setSmtpForm] = useState(smtp);
  const [retentionForm, setRetentionForm] = useState(retention);
  const [ctForm, setCtForm] = useState(ctWatch);
  const [ctResult, setCtResult] = useState<any>(null);
  const [routeForm, setRouteForm] = useState({ name: "", tags: "", severities: ["critical"], channelIds: [] as string[], recipients: {} as Record<string, string>, delayMinutes: 0, enabled: true });
  const fields = useMemo(() => providerFields[channel.type] ?? providerFields.webhook, [channel.type]);

  useEffect(() => setAlertForm(alerting), [alerting]);
  useEffect(() => setSmtpForm(smtp), [smtp]);
  useEffect(() => setRetentionForm(retention), [retention]);
  useEffect(() => setCtForm(ctWatch), [ctWatch]);

  const setConfig = (key: string, value: string) => setChannel((current: any) => ({ ...current, config: { ...current.config, [key]: value } }));
  const saveChannel = () => {
    props.onSaveChannel(channel);
    setChannel({ name: "", type: channel.type, enabled: true, config: {} });
  };
  const addRoute = () => {
    props.onSaveRoutes([...(routes ?? []), {
      id: crypto.randomUUID(),
      name: routeForm.name,
      tags: routeForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      severities: routeForm.severities,
      channelIds: routeForm.channelIds,
      recipients: routeForm.recipients,
      delayMinutes: routeForm.delayMinutes,
      enabled: true
    }]);
    setRouteForm({ name: "", tags: "", severities: ["critical"], channelIds: [], recipients: {}, delayMinutes: 0, enabled: true });
  };

  return (
    <section className="content">
      <div className="grid two">
        <div className="panel">
          <h3>Interface</h3>
          <label>Color mode<select value={props.theme ?? "dark"} onChange={(e) => props.setTheme(e.target.value)}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select></label>
          <div className="callout callout-info mb-0">
            <strong>AdminLTE 4 is the active interface.</strong>
            <p className="mb-0">The previous native shell was removed so navigation, cards, alerts, and forms follow one consistent admin UI.</p>
          </div>
        </div>
        <div className="panel">
          <h3><Bell size={18} /> Alert policy</h3>
          {alertForm && <>
            <label>Repeat unresolved alerts after hours<input type="number" min="1" max="720" value={alertForm.resendAfterHours} onChange={(e) => setAlertForm({ ...alertForm, resendAfterHours: Number(e.target.value) })} /></label>
            <label>Flapping threshold<input type="number" min="2" max="20" value={alertForm.flappingThreshold ?? 4} onChange={(e) => setAlertForm({ ...alertForm, flappingThreshold: Number(e.target.value) })} /></label>
            <div className="checks">
              <label><input type="checkbox" checked={alertForm.recoveryEnabled} onChange={(e) => setAlertForm({ ...alertForm, recoveryEnabled: e.target.checked })} /> Send recovery alerts</label>
              <label><input type="checkbox" checked={alertForm.certificateChangeAlerts} onChange={(e) => setAlertForm({ ...alertForm, certificateChangeAlerts: e.target.checked })} /> Alert on certificate changes</label>
              <label><input type="checkbox" checked={alertForm.tlsDeteriorationAlerts ?? true} onChange={(e) => setAlertForm({ ...alertForm, tlsDeteriorationAlerts: e.target.checked })} /> Alert on TLS or SSL Labs grade deterioration</label>
              <label><input type="checkbox" checked={alertForm.quietHoursEnabled} onChange={(e) => setAlertForm({ ...alertForm, quietHoursEnabled: e.target.checked })} /> Enable quiet hours</label>
              <label><input type="checkbox" checked={alertForm.quietSuppressCritical} onChange={(e) => setAlertForm({ ...alertForm, quietSuppressCritical: e.target.checked })} /> Also silence critical alerts</label>
            </div>
            <div className="grid two">
              <label>Grade score drop threshold<input type="number" min="1" max="50" value={alertForm.tlsDeteriorationThreshold ?? 5} onChange={(e) => setAlertForm({ ...alertForm, tlsDeteriorationThreshold: Number(e.target.value) })} /></label>
              <label>Quiet start<input type="time" value={alertForm.quietStart} onChange={(e) => setAlertForm({ ...alertForm, quietStart: e.target.value })} /></label>
              <label>Quiet end<input type="time" value={alertForm.quietEnd} onChange={(e) => setAlertForm({ ...alertForm, quietEnd: e.target.value })} /></label>
            </div>
            <button onClick={() => props.onSaveAlerting(alertForm)}>Save alert policy</button>
          </>}
        </div>
        <div className="panel">
          <h3><Mail size={18} /> Global SMTP</h3>
          {smtpForm && <>
            <div className="grid two">
              <label>SMTP host<input value={smtpForm.host} onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })} /></label>
              <label>Port<input type="number" min="1" max="65535" value={smtpForm.port} onChange={(e) => setSmtpForm({ ...smtpForm, port: Number(e.target.value) })} /></label>
              <label>Username<input value={smtpForm.username} onChange={(e) => setSmtpForm({ ...smtpForm, username: e.target.value })} /></label>
              <label>Password<input type="password" value={smtpForm.password} onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })} /></label>
              <label>Default sender<input value={smtpForm.from} onChange={(e) => setSmtpForm({ ...smtpForm, from: e.target.value })} /></label>
            </div>
            <div className="checks">
              <label><input type="checkbox" checked={smtpForm.starttls} onChange={(e) => setSmtpForm({ ...smtpForm, starttls: e.target.checked })} /> Require STARTTLS</label>
              <label><input type="checkbox" checked={smtpForm.secure} onChange={(e) => setSmtpForm({ ...smtpForm, secure: e.target.checked })} /> Direct TLS</label>
            </div>
            <button onClick={() => props.onSaveSmtp(smtpForm)}>Save SMTP settings</button>
          </>}
        </div>
      </div>
      <div className="grid two">
        <div className="panel">
          <h3>Retention</h3>
          {retentionForm && <>
            <label>Check history days<input type="number" min="1" max="3650" value={retentionForm.checkResultsDays} onChange={(e) => setRetentionForm({ ...retentionForm, checkResultsDays: Number(e.target.value) })} /></label>
            <label>Alert history days<input type="number" min="1" max="3650" value={retentionForm.alertHistoryDays} onChange={(e) => setRetentionForm({ ...retentionForm, alertHistoryDays: Number(e.target.value) })} /></label>
            <button onClick={() => props.onSaveRetention(retentionForm)}>Save retention</button>
          </>}
        </div>
        <div className="panel">
          <h3>Certificate Transparency Watch</h3>
          {ctForm && <>
            <label className="inline"><input type="checkbox" checked={ctForm.enabled} onChange={(e) => setCtForm({ ...ctForm, enabled: e.target.checked })} /> Enabled</label>
            <label>Watched domains<textarea value={(ctForm.domains ?? []).join("\n")} placeholder="example.com" onChange={(e) => setCtForm({ ...ctForm, domains: e.target.value.split(/\s+/).map((value) => value.trim()).filter(Boolean) })} /></label>
            <div className="actions"><button onClick={() => props.onSaveCtWatch(ctForm)}>Save CT watch</button><button className="ghost" onClick={async () => setCtResult(await props.onCheckCtWatch())}>Check now</button></div>
            {ctResult && <p className="muted">{ctResult.changes?.length ? `${ctResult.changes.length} CT changes found.` : "No CT changes found."}</p>}
          </>}
        </div>
      </div>
      <div className="grid two">
        <div className="panel">
          <h3>Notification routing</h3>
          <label>Name<input value={routeForm.name} onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })} /></label>
          <label>Tags<input value={routeForm.tags} placeholder="prod,mail" onChange={(e) => setRouteForm({ ...routeForm, tags: e.target.value })} /></label>
          <label>Severity<select value={routeForm.severities[0] ?? "critical"} onChange={(e) => setRouteForm({ ...routeForm, severities: [e.target.value] })}><option value="warning">Warning</option><option value="critical">Critical</option><option value="recovery">Recovery</option></select></label>
          <label>Escalation delay minutes<input type="number" min="0" max="10080" value={routeForm.delayMinutes} onChange={(e) => setRouteForm({ ...routeForm, delayMinutes: Number(e.target.value) })} /></label>
          <div className="grid two">{channels.map((item: any) => <div className="panel compact" key={item.id}><label><input type="checkbox" checked={routeForm.channelIds.includes(item.id)} onChange={() => setRouteForm((current) => ({ ...current, channelIds: current.channelIds.includes(item.id) ? current.channelIds.filter((id) => id !== item.id) : [...current.channelIds, item.id] }))} /> {item.name}</label>{routeForm.channelIds.includes(item.id) && <label>{recipientLabel(item.type)}<input value={routeForm.recipients[item.id] ?? ""} onChange={(e) => setRouteForm((current) => ({ ...current, recipients: { ...current.recipients, [item.id]: e.target.value } }))} /></label>}</div>)}</div>
          <button onClick={addRoute}>Add route</button>
          {(routes ?? []).map((route: any) => <div className="channel" key={route.id}><strong>{route.name}</strong><span>{route.tags.join(", ") || "all tags"} - {route.severities.join(", ")} - delay {route.delayMinutes ?? 0} min</span><button onClick={() => props.onSaveRoutes(routes.filter((item: any) => item.id !== route.id))}>Delete</button></div>)}
        </div>
        <div className="panel">
          <h3>Status page subscriptions</h3>
          {(subscriptions ?? []).map((item: any) => <div className="channel" key={item.id}><strong>{item.tags.join(" + ") || "all"}</strong><span>{item.type} - {item.enabled ? "active" : "pending opt-in"} - {item.target}</span><button onClick={() => props.onDeleteSubscription(item.id)}>Delete</button></div>)}
          {!(subscriptions ?? []).length && <span className="muted">No public status page subscriptions yet.</span>}
        </div>
      </div>
      <div className="grid two">
        <div className="panel">
          <h3><PlugZap size={18} /> Add notification provider</h3>
          <label>Name<input value={channel.name} onChange={(e) => setChannel({ ...channel, name: e.target.value })} /></label>
          <label>Provider<select value={channel.type} onChange={(e) => setChannel({ name: channel.name, type: e.target.value, enabled: true, config: {} })}>
            {Object.keys(providerFields).map((type) => <option value={type} key={type}>{labelFor(type)}</option>)}
          </select></label>
          {!fields.length && <p className="muted">Recipients are configured on each monitor or notification route.</p>}
          {fields.map((field) => <label key={field.key}>{field.label}<input type={field.type ?? "text"} value={channel.config[field.key] ?? ""} placeholder={field.placeholder} onChange={(e) => setConfig(field.key, e.target.value)} /></label>)}
          <label className="inline"><input type="checkbox" checked={channel.enabled} onChange={(e) => setChannel({ ...channel, enabled: e.target.checked })} /> Enabled</label>
          <button onClick={saveChannel}>Save provider</button>
        </div>
        <div className="panel">
          <h3>Configured providers</h3>
          {channels.map((item: any) => (
            <div className="channel" key={item.id}>
              <strong>{item.name}</strong>
              <span>{labelFor(item.type)} - {item.enabled ? "enabled" : "disabled"}</span>
              <div className="actions end"><button onClick={() => props.onTest(item.id)}>Test</button><button className="icon" title="Delete provider" onClick={() => props.onDeleteChannel(item.id)}><Trash2 size={16} /></button></div>
            </div>
          ))}
          {!channels.length && <span className="muted">No notification providers configured.</span>}
        </div>
      </div>
    </section>
  );
}

const labelFor = (type: string) => ({
  email: "Email SMTP",
  webhook: "Generic webhook",
  discord: "Discord",
  slack: "Slack",
  teams: "Microsoft Teams",
  mattermost: "Mattermost",
  pushover: "Pushover",
  telegram: "Telegram",
  gotify: "Gotify",
  ntfy: "ntfy.sh",
  matrix: "Matrix",
  pagerduty: "PagerDuty",
  opsgenie: "Opsgenie"
}[type] ?? type);

const recipientLabel = (type: string) => type === "email" ? "Recipients" : type === "telegram" ? "Chat ID" : type === "pushover" ? "User key" : type === "matrix" ? "Room ID" : "Target URL";
