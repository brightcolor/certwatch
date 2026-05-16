import { useState } from "react";
import type { ReactNode } from "react";
import type { Monitor } from "../api/client";

const blank = {
  name: "",
  host: "",
  port: 443,
  type: "https",
  enabled: true,
  intervalSeconds: 3600,
  timeoutSeconds: 10,
  warningDays: 30,
  criticalDays: 7,
  gracePeriodSeconds: 0,
  sniEnabled: true,
  sniHost: "",
  validateCertificate: true,
  allowSelfSigned: false,
  tags: [],
  notes: "",
  owner: "",
  config: {},
  notificationChannelIds: [],
  notificationRecipients: {}
};

const protocolOptions = [
  { group: "TLS certificates", options: [
    { value: "https", label: "HTTPS", port: 443 },
    { value: "tls", label: "Custom TCP TLS", port: 443 },
    { value: "smtps", label: "SMTPS / SMTP SSL", port: 465 },
    { value: "imaps", label: "IMAPS / IMAP SSL", port: 993 },
    { value: "pop3s", label: "POP3S / POP3 SSL", port: 995 },
    { value: "ldaps", label: "LDAPS", port: 636 },
    { value: "ftps", label: "Implicit FTPS", port: 990 },
    { value: "xmpps", label: "XMPP TLS", port: 5223 }
  ] },
  { group: "STARTTLS", options: [
    { value: "smtp_starttls", label: "SMTP STARTTLS", port: 587 },
    { value: "imap_starttls", label: "IMAP STARTTLS", port: 143 },
    { value: "pop3_starttls", label: "POP3 STARTTLS", port: 110 },
    { value: "ftp_starttls", label: "FTP explicit TLS", port: 21 }
  ] },
  { group: "Service health", options: [
    { value: "http", label: "HTTP healthcheck", port: 80 },
    { value: "http_login", label: "HTTP login check", port: 443 },
    { value: "tcp", label: "TCP port check", port: 80 },
    { value: "dns", label: "DNS record check", port: 53 },
    { value: "ssh", label: "SSH login/banner", port: 22 },
    { value: "ftp", label: "FTP login/banner", port: 21 },
    { value: "smtp", label: "SMTP login/banner", port: 25 },
    { value: "imap", label: "IMAP login/banner", port: 143 },
    { value: "pop3", label: "POP3 login/banner", port: 110 }
  ] }
];
const flatProtocolOptions = protocolOptions.flatMap((group) => group.options);

export function MonitorForm({ monitor, channels = [], onCancel, onSave, onSaveAndCheck }: { monitor?: Monitor | null; channels?: any[]; onCancel: () => void; onSave: (data: any) => void; onSaveAndCheck: (data: any) => void }) {
  const [form, setForm] = useState<any>({ ...blank, ...monitor, tagsText: monitor?.tags?.join(", ") ?? "" });
  const data = () => ({ ...form, port: Number(form.port), intervalSeconds: Number(form.intervalSeconds), timeoutSeconds: Number(form.timeoutSeconds), warningDays: Number(form.warningDays), criticalDays: Number(form.criticalDays), gracePeriodSeconds: Number(form.gracePeriodSeconds), tags: String(form.tagsText || "").split(",").map((tag) => tag.trim()).filter(Boolean), sniHost: form.sniHost || null });
  const set = (key: string, value: unknown) => setForm((current: any) => ({ ...current, [key]: value }));
  const setConfig = (key: string, value: unknown) => set("config", { ...(form.config ?? {}), [key]: value });
  const setProtocol = (type: string) => {
    const option = flatProtocolOptions.find((item) => item.value === type);
    setForm((current: any) => ({
      ...current,
      type,
      port: option?.port ?? current.port,
      config: defaultsForType(type, current.config ?? {})
    }));
  };
  const toggleChannel = (id: string) => {
    const current = new Set(form.notificationChannelIds ?? []);
    current.has(id) ? current.delete(id) : current.add(id);
    set("notificationChannelIds", [...current]);
  };
  const setRecipient = (id: string, value: string) => set("notificationRecipients", { ...(form.notificationRecipients ?? {}), [id]: value });

  return (
    <div className="modal">
      <form className="modal-panel" onSubmit={(e) => { e.preventDefault(); onSave(data()); }}>
        <div className="modal-head">
          <div>
            <h2>{monitor ? "Edit monitor" : "New monitor"}</h2>
            <p className="muted">Configure the target, schedule, validation, login checks, and alert routing.</p>
          </div>
          <button type="button" className="ghost" onClick={onCancel}>Close</button>
        </div>
        <FormSection title="Target">
          <label>Name<input value={form.name} onChange={(e) => set("name", e.target.value)} required /></label>
          <label>Type<select value={form.type} onChange={(e) => setProtocol(e.target.value)}>{protocolOptions.map((group) => <optgroup key={group.group} label={group.group}>{group.options.map((option) => <option value={option.value} key={option.value}>{option.label} ({option.port})</option>)}</optgroup>)}</select></label>
          <label>Hostname<input value={form.host} onChange={(e) => set("host", e.target.value)} required /></label>
          <label>Port<input type="number" min="1" max="65535" value={form.port} onChange={(e) => set("port", e.target.value)} /></label>
          <label>Labels<input value={form.tagsText} onChange={(e) => set("tagsText", e.target.value)} placeholder="prod, mail, customer-a" /></label>
          <label>Owner<input value={form.owner ?? ""} onChange={(e) => set("owner", e.target.value)} placeholder="Team or person" /></label>
        </FormSection>
        <FormSection title="Schedule and thresholds">
          <label>Interval seconds<input type="number" min="60" value={form.intervalSeconds} onChange={(e) => set("intervalSeconds", e.target.value)} /></label>
          <label>Timeout seconds<input type="number" min="2" value={form.timeoutSeconds} onChange={(e) => set("timeoutSeconds", e.target.value)} /></label>
          <label>Warning days<input type="number" min="1" value={form.warningDays} onChange={(e) => set("warningDays", e.target.value)} /></label>
          <label>Critical days<input type="number" min="0" value={form.criticalDays} onChange={(e) => set("criticalDays", e.target.value)} /></label>
          <label>Alert grace period seconds<input type="number" min="0" max="604800" value={form.gracePeriodSeconds ?? 0} onChange={(e) => set("gracePeriodSeconds", e.target.value)} /></label>
        </FormSection>
        <FormSection title="TLS validation">
          <label>SNI hostname<input value={form.sniHost ?? ""} onChange={(e) => set("sniHost", e.target.value)} /></label>
          <div className="checks">
            <label><input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} /> Active</label>
            <label><input type="checkbox" checked={form.sniEnabled} onChange={(e) => set("sniEnabled", e.target.checked)} /> Use SNI</label>
            <label><input type="checkbox" checked={form.validateCertificate} onChange={(e) => set("validateCertificate", e.target.checked)} /> Validate chain</label>
            <label><input type="checkbox" checked={form.allowSelfSigned} onChange={(e) => set("allowSelfSigned", e.target.checked)} /> Allow self-signed</label>
          </div>
        </FormSection>
        {usesServiceConfig(form.type) && <FormSection title="Service and login check">
            {usesHttpConfig(form.type) && <>
              <label>Scheme<select value={String(form.config?.scheme ?? (form.port === 443 ? "https" : "http"))} onChange={(e) => setConfig("scheme", e.target.value)}><option value="https">HTTPS</option><option value="http">HTTP</option></select></label>
              <label>Path<input value={String(form.config?.path ?? "/")} onChange={(e) => setConfig("path", e.target.value)} /></label>
              <label>Expected status<input type="number" min="100" max="599" value={String(form.config?.expectedStatus ?? 200)} onChange={(e) => setConfig("expectedStatus", Number(e.target.value))} /></label>
              <label>Expected text<input value={String(form.config?.expectedText ?? "")} onChange={(e) => setConfig("expectedText", e.target.value)} placeholder="Optional response text" /></label>
            </>}
            {form.type === "http_login" && <>
              <label>Auth mode<select value={String(form.config?.authType ?? "form")} onChange={(e) => setConfig("authType", e.target.value)}><option value="form">Form POST</option><option value="basic">Basic Auth</option></select></label>
              <label>Username<input value={String(form.config?.username ?? "")} onChange={(e) => setConfig("username", e.target.value)} autoComplete="off" /></label>
              <label>Password<input type="password" value={String(form.config?.password ?? "")} onChange={(e) => setConfig("password", e.target.value)} autoComplete="new-password" /></label>
              {String(form.config?.authType ?? "form") === "form" && <>
                <label>Username field<input value={String(form.config?.usernameField ?? "username")} onChange={(e) => setConfig("usernameField", e.target.value)} /></label>
                <label>Password field<input value={String(form.config?.passwordField ?? "password")} onChange={(e) => setConfig("passwordField", e.target.value)} /></label>
              </>}
            </>}
            {["smtp_starttls", "imap_starttls", "pop3_starttls"].includes(form.type) && <>
              <label><input type="checkbox" checked={Boolean(form.config?.loginEnabled)} onChange={(e) => setConfig("loginEnabled", e.target.checked)} /> Test login after STARTTLS</label>
              <label>Username<input value={String(form.config?.username ?? "")} onChange={(e) => setConfig("username", e.target.value)} autoComplete="off" /></label>
              <label>Password<input type="password" value={String(form.config?.password ?? "")} onChange={(e) => setConfig("password", e.target.value)} autoComplete="new-password" /></label>
            </>}
            {form.type === "dns" && <>
              <label>Record type<select value={String(form.config?.recordType ?? "A")} onChange={(e) => setConfig("recordType", e.target.value)}>{["A", "AAAA", "CNAME", "MX", "TXT"].map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
              <label>Expected value<input value={String(form.config?.expectedValue ?? "")} onChange={(e) => setConfig("expectedValue", e.target.value)} placeholder="Optional substring" /></label>
            </>}
            {usesProtocolLogin(form.type) && <>
              <label><input type="checkbox" checked={Boolean(form.config?.loginEnabled)} onChange={(e) => setConfig("loginEnabled", e.target.checked)} /> Test login</label>
              <label>Username<input value={String(form.config?.username ?? "")} onChange={(e) => setConfig("username", e.target.value)} autoComplete="off" /></label>
              <label>Password<input type="password" value={String(form.config?.password ?? "")} onChange={(e) => setConfig("password", e.target.value)} autoComplete="new-password" /></label>
              {form.type !== "ssh" && <label><input type="checkbox" checked={Boolean(form.config?.allowInsecureLogin)} onChange={(e) => setConfig("allowInsecureLogin", e.target.checked)} /> Allow plaintext login test</label>}
            </>}
          {(form.type === "http_login" || usesProtocolLogin(form.type) || form.type.endsWith("_starttls")) && <p className="muted">Login secrets are encrypted at rest and masked after saving. Plain FTP, SMTP, IMAP and POP3 login tests require explicit plaintext approval.</p>}
        </FormSection>}
        <div className="form-section">
          <h3>Notifications</h3>
          <p className="muted">Select provider channels and set the recipient or target for this monitor.</p>
          <div className="grid two">
            {channels.map((channel) => (
              <div key={channel.id} className="panel compact">
                <label><input type="checkbox" checked={(form.notificationChannelIds ?? []).includes(channel.id)} onChange={() => toggleChannel(channel.id)} /> {channel.name}</label>
                {(form.notificationChannelIds ?? []).includes(channel.id) && <label>{recipientLabel(channel.type)}<input value={(form.notificationRecipients ?? {})[channel.id] ?? ""} placeholder={recipientPlaceholder(channel.type)} onChange={(e) => setRecipient(channel.id, e.target.value)} /></label>}
              </div>
            ))}
            {!channels.length && <span className="muted">No channels configured yet.</span>}
          </div>
        </div>
        <label>Notes<textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></label>
        <div className="actions end"><button type="button" className="ghost" onClick={onCancel}>Cancel</button><button type="button" onClick={() => onSaveAndCheck(data())}>Save and check</button><button type="submit">Save</button></div>
      </form>
    </div>
  );
}

const recipientLabel = (type: string) => type === "email" ? "Recipients" : type === "telegram" ? "Chat ID" : type === "pushover" ? "User key" : type === "matrix" ? "Room ID" : type === "pagerduty" ? "Routing key override" : type === "opsgenie" ? "Responder/alias override" : "Target URL";
const recipientPlaceholder = (type: string) => type === "email" ? "ops@example.com, admin@example.com" : type === "telegram" ? "-1001234567890" : type === "pushover" ? "Pushover user key" : type === "matrix" ? "!room:example.com" : "https://...";

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return <div className="form-section"><h3>{title}</h3><div className="grid two">{children}</div></div>;
}

const usesHttpConfig = (type: string) => type === "http" || type === "http_login";
const usesProtocolLogin = (type: string) => ["ssh", "ftp", "smtp", "imap", "pop3"].includes(type);
const usesServiceConfig = (type: string) => usesHttpConfig(type) || type === "dns" || usesProtocolLogin(type) || ["smtp_starttls", "imap_starttls", "pop3_starttls"].includes(type);
const defaultsForType = (type: string, current: Record<string, unknown>) => {
  if (type === "http") return { scheme: "http", path: "/", expectedStatus: 200, ...current };
  if (type === "http_login") return { scheme: "https", path: "/login", expectedStatus: 200, authType: "form", usernameField: "username", passwordField: "password", ...current };
  if (type === "dns") return { recordType: "A", ...current };
  return current;
};
