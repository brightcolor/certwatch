import { useState } from "react";
import type { ReactNode } from "react";
import type { Monitor } from "../api/client";
import { TagInput } from "../components/TagInput";
import { MaintenanceWindowBuilder } from "../components/MaintenanceWindowBuilder";
import { collectsCertificate, serviceSecurityMode, transportSecurityProtocols } from "../utils/monitorTypes";

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
    { value: "tcp", label: "TCP or TLS port check", port: 443 },
    { value: "dns", label: "DNS record check", port: 53 },
    { value: "ssh", label: "SSH login/banner", port: 22 },
    { value: "ftp", label: "FTP service/login", port: 21 },
    { value: "smtp", label: "SMTP service/login", port: 587 },
    { value: "imap", label: "IMAP service/login", port: 143 },
    { value: "pop3", label: "POP3 service/login", port: 110 }
  ] }
];
const flatProtocolOptions = protocolOptions.flatMap((group) => group.options);
const labelSuggestions = ["prod", "staging", "mail", "web", "api", "dns", "customer", "internal"];

export function MonitorForm({ monitor, channels = [], onCancel, onSave, onSaveAndCheck }: { monitor?: Monitor | null; channels?: any[]; onCancel: () => void; onSave: (data: any) => void; onSaveAndCheck: (data: any) => void }) {
  const [form, setForm] = useState<any>({ ...blank, ...monitor, tags: monitor?.tags ?? [] });
  const [activeStep, setActiveStep] = useState<MonitorFormStep>("basics");
  const data = () => ({ ...form, port: Number(form.port), intervalSeconds: Number(form.intervalSeconds), timeoutSeconds: Number(form.timeoutSeconds), warningDays: Number(form.warningDays), criticalDays: Number(form.criticalDays), gracePeriodSeconds: Number(form.gracePeriodSeconds), sniHost: form.sniHost || null });
  const set = (key: string, value: unknown) => setForm((current: any) => ({ ...current, [key]: value }));
  const setConfig = (key: string, value: unknown) => set("config", { ...(form.config ?? {}), [key]: value });
  const transportMode = serviceSecurityMode(form.type, form.config);
  const setProtocol = (type: string) => {
    const option = flatProtocolOptions.find((item) => item.value === type);
    const config = defaultsForType(type, form.config ?? {});
    setForm((current: any) => ({
      ...current,
      type,
      port: defaultPortFor(type, serviceSecurityMode(type, config), option?.port ?? current.port),
      config
    }));
  };
  const setTransportSecurity = (mode: string) => {
    setForm((current: any) => ({
      ...current,
      port: defaultPortFor(current.type, mode, current.port),
      config: { ...(current.config ?? {}), securityMode: mode }
    }));
  };
  const toggleChannel = (id: string) => {
    const current = new Set(form.notificationChannelIds ?? []);
    current.has(id) ? current.delete(id) : current.add(id);
    set("notificationChannelIds", [...current]);
  };
  const setRecipient = (id: string, value: string) => set("notificationRecipients", { ...(form.notificationRecipients ?? {}), [id]: value });
  const appendMaintenanceWindow = (value: string) => {
    const current = String(form.maintenanceWindows ?? "").trim();
    set("maintenanceWindows", [current, value].filter(Boolean).join("\n"));
  };

  return (
    <div className="modal">
      <form className="modal-panel" onSubmit={(e) => { e.preventDefault(); onSave(data()); }}>
        <div className="modal-head">
          <div>
            <h2>{monitor ? "Edit monitor" : "New monitor"}</h2>
            <p className="muted">Configure the target, schedule, validation, login checks, and alert routing.</p>
          </div>
          <button type="button" className="danger" onClick={onCancel}>Close</button>
        </div>
        <FormSteps active={activeStep} onChange={setActiveStep} />
        <div className="step-summary">
          <span className={`soft-pill ${form.enabled ? "success" : "info"}`}><i className={`bi ${form.enabled ? "bi-play-fill" : "bi-pause-fill"}`}></i>{form.enabled ? "Active" : "Paused"}</span>
          <span className="soft-pill info"><i className="bi bi-hdd-network"></i>{form.host || "No host"}:{form.port}</span>
          <span className="soft-pill info"><i className="bi bi-tags"></i>{(form.tags ?? []).length || 0} labels</span>
        </div>
        {activeStep === "basics" && <>
          <FormSection title="Target">
            <label>Name<input value={form.name} onChange={(e) => set("name", e.target.value)} required /></label>
            <label>Type<select value={form.type} onChange={(e) => setProtocol(e.target.value)}>{protocolOptions.map((group) => <optgroup key={group.group} label={group.group}>{group.options.map((option) => <option value={option.value} key={option.value}>{option.label} ({option.port})</option>)}</optgroup>)}</select></label>
            {supportsTransportSecurity(form.type) && <label>Transport security<select value={transportMode} onChange={(e) => setTransportSecurity(e.target.value)}>
              <option value="auto">Auto</option>
              {form.type !== "tcp" && <option value="starttls">STARTTLS / explicit TLS</option>}
              <option value="tls">SSL/TLS</option>
              <option value="plain">Plain</option>
            </select></label>}
            <label>Hostname<input value={form.host} onChange={(e) => set("host", e.target.value)} required /></label>
            <label>Port<input type="number" min="1" max="65535" value={form.port} onChange={(e) => set("port", e.target.value)} /></label>
            <TagInput value={form.tags ?? []} onChange={(tags) => set("tags", tags)} suggestions={labelSuggestions} hint="Labels group monitors, drive status pages and badges, and can target alert routes." />
            <label>Owner<input value={form.owner ?? ""} onChange={(e) => set("owner", e.target.value)} placeholder="Team or person" /></label>
          </FormSection>
          <FormSection title="Schedule">
            <label>Interval seconds<input type="number" min="60" value={form.intervalSeconds} onChange={(e) => set("intervalSeconds", e.target.value)} /></label>
            <label>Timeout seconds<input type="number" min="2" value={form.timeoutSeconds} onChange={(e) => set("timeoutSeconds", e.target.value)} /></label>
            <div className="checks">
              <label><input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} /> Active</label>
            </div>
          </FormSection>
        </>}
        {activeStep === "checks" && <>
          <FormSection title="DNS and change watches">
            <label><input type="checkbox" checked={form.config?.dnsCheckEnabled !== false} onChange={(e) => setConfig("dnsCheckEnabled", e.target.checked)} /> Collect resolved IPs and compare resolvers</label>
            <label>DNS change alerts<select value={String(form.config?.dnsChangeAlertMode ?? "global")} onChange={(e) => setConfig("dnsChangeAlertMode", e.target.value)}>
              <option value="global">Use global policy</option>
              <option value="enabled">Always alert for this monitor</option>
              <option value="disabled">Never alert for this monitor</option>
            </select></label>
            <label>Certificate change alerts<select value={String(form.config?.certificateChangeAlertMode ?? "global")} onChange={(e) => setConfig("certificateChangeAlertMode", e.target.value)}>
              <option value="global">Use global policy</option>
              <option value="enabled">Always alert for this monitor</option>
              <option value="disabled">Never alert for this monitor</option>
            </select></label>
            <p className="muted">DNS comparison uses fresh lookups against the authoritative nameservers plus Cloudflare, Quad9, and Google on every check. Results are shown in monitor details; alerts only fire when enabled globally or for this monitor.</p>
          </FormSection>
          {collectsCertificate(form.type, form.config, Number(form.port)) && <FormSection title="TLS validation">
            <label>SNI hostname<input value={form.sniHost ?? ""} onChange={(e) => set("sniHost", e.target.value)} /></label>
            <div className="checks">
              <label><input type="checkbox" checked={form.sniEnabled} onChange={(e) => set("sniEnabled", e.target.checked)} /> Use SNI</label>
              <label><input type="checkbox" checked={form.validateCertificate} onChange={(e) => set("validateCertificate", e.target.checked)} /> Validate chain</label>
              <label><input type="checkbox" checked={form.allowSelfSigned} onChange={(e) => set("allowSelfSigned", e.target.checked)} /> Allow self-signed</label>
              {sslLabsEligible(form.type, Number(form.port), form.config) && <label><input type="checkbox" checked={Boolean(form.config?.sslLabsEnabled)} onChange={(e) => setConfig("sslLabsEnabled", e.target.checked)} /> External SSL Labs check every 24h</label>}
            </div>
            {!sslLabsEligible(form.type, Number(form.port), form.config) && <p className="muted">SSL Labs is available for public HTTPS hosts on port 443. STARTTLS, mail, and private targets continue to use crt.watch's local TLS checks.</p>}
          </FormSection>}
          {usesServiceConfig(form.type) && <FormSection title="Service and login check">
            {usesHttpConfig(form.type) && <>
              <label>Scheme<select value={String(form.config?.scheme ?? (form.port === 443 ? "https" : "http"))} onChange={(e) => setConfig("scheme", e.target.value)}><option value="https">HTTPS</option><option value="http">HTTP</option></select></label>
              <label>Path<input value={String(form.config?.path ?? "/")} onChange={(e) => setConfig("path", e.target.value)} /></label>
              <label>Expected status<input type="number" min="100" max="599" value={String(form.config?.expectedStatus ?? 200)} onChange={(e) => setConfig("expectedStatus", Number(e.target.value))} /></label>
              <label>Expected text<input value={String(form.config?.expectedText ?? "")} onChange={(e) => setConfig("expectedText", e.target.value)} placeholder="Optional response text" /></label>
              <label>Expected header<input value={String(form.config?.expectedHeader ?? "")} onChange={(e) => setConfig("expectedHeader", e.target.value)} placeholder="x-app-version: 1.2" /></label>
              <label><input type="checkbox" checked={Boolean(form.config?.followRedirects)} onChange={(e) => setConfig("followRedirects", e.target.checked)} /> Follow redirects</label>
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
            {usesTlsLogin(form.type) && <>
              <label><input type="checkbox" checked={Boolean(form.config?.loginEnabled)} onChange={(e) => setConfig("loginEnabled", e.target.checked)} /> Test login over TLS</label>
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
              {form.type !== "ssh" && transportMode !== "tls" && transportMode !== "starttls" && <label><input type="checkbox" checked={Boolean(form.config?.allowInsecureLogin)} onChange={(e) => setConfig("allowInsecureLogin", e.target.checked)} /> Allow plaintext fallback login</label>}
            </>}
          {(form.type === "http_login" || usesProtocolLogin(form.type) || usesTlsLogin(form.type)) && <p className="muted">Login secrets are encrypted at rest and masked after saving. FTP, SMTP, IMAP, POP3, and TCP can collect certificate details when transport security is Auto, STARTTLS, or SSL/TLS. Plain mode verifies availability or credentials only.</p>}
          </FormSection>}
        </>}
        {activeStep === "alerts" && <>
          <FormSection title="Alert thresholds">
            <label>Warning days<input type="number" min="1" value={form.warningDays} onChange={(e) => set("warningDays", e.target.value)} /></label>
            <label>Critical days<input type="number" min="0" value={form.criticalDays} onChange={(e) => set("criticalDays", e.target.value)} /></label>
            <label>Alert grace period seconds<input type="number" min="0" max="604800" value={form.gracePeriodSeconds ?? 0} onChange={(e) => set("gracePeriodSeconds", e.target.value)} /></label>
          </FormSection>
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
        </>}
        {activeStep === "advanced" && <>
          <FormSection title="Maintenance">
            <MaintenanceWindowBuilder onUse={appendMaintenanceWindow} buttonLabel="Append range" />
            <label>Maintenance windows<textarea value={form.maintenanceWindows ?? ""} placeholder="daily 22:00-23:00&#10;mon-fri 01:00-02:00&#10;2026-06-01T20:00:00/2026-06-01T22:00:00" onChange={(e) => set("maintenanceWindows", e.target.value)} /></label>
          </FormSection>
          <label>Notes<textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></label>
        </>}
        <div className="actions end sticky-actions"><button type="button" className="danger" onClick={onCancel}>Cancel</button><button type="button" className="success" onClick={() => onSaveAndCheck(data())}>Save and check</button><button className="success" type="submit">Save</button></div>
      </form>
    </div>
  );
}

const recipientLabel = (type: string) => type === "email" ? "Recipients" : type === "telegram" ? "Chat ID" : type === "pushover" ? "User key" : type === "matrix" ? "Room ID" : type === "pagerduty" ? "Routing key override" : type === "opsgenie" ? "Responder/alias override" : "Target URL";
const recipientPlaceholder = (type: string) => type === "email" ? "ops@example.com, admin@example.com" : type === "telegram" ? "-1001234567890" : type === "pushover" ? "Pushover user key" : type === "matrix" ? "!room:example.com" : "https://...";

type MonitorFormStep = "basics" | "checks" | "alerts" | "advanced";

const monitorSteps: Array<{ id: MonitorFormStep; label: string; icon: string }> = [
  { id: "basics", label: "Basics", icon: "bi-bullseye" },
  { id: "checks", label: "Checks", icon: "bi-shield-check" },
  { id: "alerts", label: "Alerts", icon: "bi-bell" },
  { id: "advanced", label: "Advanced", icon: "bi-sliders" }
];

function FormSteps({ active, onChange }: { active: MonitorFormStep; onChange: (step: MonitorFormStep) => void }) {
  return (
    <div className="form-steps" role="tablist" aria-label="Monitor form sections">
      {monitorSteps.map((step) => (
        <button type="button" className={`form-step ${active === step.id ? "active" : ""}`} key={step.id} onClick={() => onChange(step.id)} role="tab" aria-selected={active === step.id}>
          <span><i className={`bi ${step.icon}`}></i></span>{step.label}
        </button>
      ))}
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return <div className="form-section soft-section"><h3>{title}</h3><div className="grid two">{children}</div></div>;
}

const usesHttpConfig = (type: string) => type === "http" || type === "http_login";
const usesProtocolLogin = (type: string) => ["ssh", "ftp", "smtp", "imap", "pop3"].includes(type);
const usesTlsLogin = (type: string) => ["smtp_starttls", "imap_starttls", "pop3_starttls", "ftp_starttls", "smtps", "imaps", "pop3s", "ftps"].includes(type);
const usesServiceConfig = (type: string) => usesHttpConfig(type) || type === "dns" || usesProtocolLogin(type) || usesTlsLogin(type);
const supportsTransportSecurity = (type: string) => transportSecurityProtocols.has(type);
const sslLabsEligible = (type: string, port: number, config?: Record<string, unknown>) =>
  port === 443 && (type === "https" || type === "tls" || ((type === "http" || type === "http_login") && String(config?.scheme ?? "https") === "https"));
const defaultsForType = (type: string, current: Record<string, unknown>) => {
  if (type === "http") return { scheme: "http", path: "/", expectedStatus: 200, ...current };
  if (type === "http_login") return { scheme: "https", path: "/login", expectedStatus: 200, authType: "form", usernameField: "username", passwordField: "password", ...current };
  if (type === "dns") return { recordType: "A", ...current };
  if (supportsTransportSecurity(type)) return { securityMode: "auto", ...current };
  return current;
};

const defaultPorts: Record<string, Partial<Record<string, number>>> = {
  tcp: { auto: 443, tls: 443 },
  ftp: { auto: 21, starttls: 21, tls: 990, plain: 21 },
  smtp: { auto: 587, starttls: 587, tls: 465, plain: 25 },
  imap: { auto: 143, starttls: 143, tls: 993, plain: 143 },
  pop3: { auto: 110, starttls: 110, tls: 995, plain: 110 }
};

const defaultPortFor = (type: string, mode: string, fallback: number) => defaultPorts[type]?.[mode] ?? fallback;
