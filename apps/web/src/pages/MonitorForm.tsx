import { useState } from "react";
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
  sniEnabled: true,
  sniHost: "",
  validateCertificate: true,
  allowSelfSigned: false,
  tags: [],
  notes: "",
  owner: "",
  notificationChannelIds: [],
  notificationRecipients: {}
};

const protocolOptions = [
  { value: "https", label: "HTTPS", port: 443 },
  { value: "tls", label: "Custom TCP TLS", port: 443 },
  { value: "smtps", label: "SMTPS / SMTP SSL", port: 465 },
  { value: "imaps", label: "IMAPS / IMAP SSL", port: 993 },
  { value: "pop3s", label: "POP3S / POP3 SSL", port: 995 },
  { value: "ldaps", label: "LDAPS", port: 636 },
  { value: "ftps", label: "Implicit FTPS", port: 990 },
  { value: "xmpps", label: "XMPP TLS", port: 5223 },
  { value: "smtp_starttls", label: "SMTP STARTTLS", port: 587 },
  { value: "imap_starttls", label: "IMAP STARTTLS", port: 143 },
  { value: "pop3_starttls", label: "POP3 STARTTLS", port: 110 }
];

export function MonitorForm({ monitor, channels = [], onCancel, onSave, onSaveAndCheck }: { monitor?: Monitor | null; channels?: any[]; onCancel: () => void; onSave: (data: any) => void; onSaveAndCheck: (data: any) => void }) {
  const [form, setForm] = useState<any>({ ...blank, ...monitor, tagsText: monitor?.tags?.join(", ") ?? "" });
  const data = () => ({ ...form, port: Number(form.port), intervalSeconds: Number(form.intervalSeconds), timeoutSeconds: Number(form.timeoutSeconds), warningDays: Number(form.warningDays), criticalDays: Number(form.criticalDays), tags: String(form.tagsText || "").split(",").map((tag) => tag.trim()).filter(Boolean), sniHost: form.sniHost || null });
  const set = (key: string, value: unknown) => setForm((current: any) => ({ ...current, [key]: value }));
  const setProtocol = (type: string) => {
    const option = protocolOptions.find((item) => item.value === type);
    setForm((current: any) => ({
      ...current,
      type,
      port: option?.port ?? current.port
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
        <h2>{monitor ? "Edit monitor" : "New monitor"}</h2>
        <div className="grid two">
          <label>Name<input value={form.name} onChange={(e) => set("name", e.target.value)} required /></label>
          <label>Protocol<select value={form.type} onChange={(e) => setProtocol(e.target.value)}>{protocolOptions.map((option) => <option value={option.value} key={option.value}>{option.label} ({option.port})</option>)}</select></label>
          <label>Hostname<input value={form.host} onChange={(e) => set("host", e.target.value)} required /></label>
          <label>Port<input type="number" min="1" max="65535" value={form.port} onChange={(e) => set("port", e.target.value)} /></label>
          <label>Interval seconds<input type="number" min="60" value={form.intervalSeconds} onChange={(e) => set("intervalSeconds", e.target.value)} /></label>
          <label>Timeout seconds<input type="number" min="2" value={form.timeoutSeconds} onChange={(e) => set("timeoutSeconds", e.target.value)} /></label>
          <label>Warning days<input type="number" min="1" value={form.warningDays} onChange={(e) => set("warningDays", e.target.value)} /></label>
          <label>Critical days<input type="number" min="0" value={form.criticalDays} onChange={(e) => set("criticalDays", e.target.value)} /></label>
          <label>SNI hostname<input value={form.sniHost ?? ""} onChange={(e) => set("sniHost", e.target.value)} /></label>
          <label>Tags<input value={form.tagsText} onChange={(e) => set("tagsText", e.target.value)} placeholder="prod, mail, customer-a" /></label>
        </div>
        <div className="panel compact">
          <h3>Notifications for this monitor</h3>
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
        <div className="checks">
          <label><input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} /> Active</label>
          <label><input type="checkbox" checked={form.sniEnabled} onChange={(e) => set("sniEnabled", e.target.checked)} /> Use SNI</label>
          <label><input type="checkbox" checked={form.validateCertificate} onChange={(e) => set("validateCertificate", e.target.checked)} /> Validate chain</label>
          <label><input type="checkbox" checked={form.allowSelfSigned} onChange={(e) => set("allowSelfSigned", e.target.checked)} /> Allow self-signed</label>
        </div>
        <label>Notes<textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></label>
        <div className="actions end"><button type="button" className="ghost" onClick={onCancel}>Cancel</button><button type="button" onClick={() => onSaveAndCheck(data())}>Save and check</button><button type="submit">Save</button></div>
      </form>
    </div>
  );
}

const recipientLabel = (type: string) => type === "email" ? "Recipients" : type === "telegram" ? "Chat ID" : type === "pushover" ? "User key" : type === "matrix" ? "Room ID" : type === "pagerduty" ? "Routing key override" : type === "opsgenie" ? "Responder/alias override" : "Target URL";
const recipientPlaceholder = (type: string) => type === "email" ? "ops@example.com, admin@example.com" : type === "telegram" ? "-1001234567890" : type === "pushover" ? "Pushover user key" : type === "matrix" ? "!room:example.com" : "https://...";
