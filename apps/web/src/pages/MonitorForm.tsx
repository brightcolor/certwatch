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
  notificationChannelIds: []
};

export function MonitorForm({ monitor, onCancel, onSave, onSaveAndCheck }: { monitor?: Monitor | null; onCancel: () => void; onSave: (data: any) => void; onSaveAndCheck: (data: any) => void }) {
  const [form, setForm] = useState<any>({ ...blank, ...monitor, tagsText: monitor?.tags?.join(", ") ?? "" });
  const data = () => ({ ...form, port: Number(form.port), intervalSeconds: Number(form.intervalSeconds), timeoutSeconds: Number(form.timeoutSeconds), warningDays: Number(form.warningDays), criticalDays: Number(form.criticalDays), tags: String(form.tagsText || "").split(",").map((tag) => tag.trim()).filter(Boolean), sniHost: form.sniHost || null });
  const set = (key: string, value: unknown) => setForm((current: any) => ({ ...current, [key]: value }));

  return (
    <div className="modal">
      <form className="modal-panel" onSubmit={(e) => { e.preventDefault(); onSave(data()); }}>
        <h2>{monitor ? "Edit monitor" : "New monitor"}</h2>
        <div className="grid two">
          <label>Name<input value={form.name} onChange={(e) => set("name", e.target.value)} required /></label>
          <label>Protocol<select value={form.type} onChange={(e) => set("type", e.target.value)}><option value="https">HTTPS</option><option value="tls">TCP TLS</option><option value="smtp_starttls">SMTP STARTTLS</option><option value="imap_starttls">IMAP STARTTLS</option><option value="pop3_starttls">POP3 STARTTLS</option></select></label>
          <label>Hostname<input value={form.host} onChange={(e) => set("host", e.target.value)} required /></label>
          <label>Port<input type="number" min="1" max="65535" value={form.port} onChange={(e) => set("port", e.target.value)} /></label>
          <label>Interval seconds<input type="number" min="60" value={form.intervalSeconds} onChange={(e) => set("intervalSeconds", e.target.value)} /></label>
          <label>Timeout seconds<input type="number" min="2" value={form.timeoutSeconds} onChange={(e) => set("timeoutSeconds", e.target.value)} /></label>
          <label>Warning days<input type="number" min="1" value={form.warningDays} onChange={(e) => set("warningDays", e.target.value)} /></label>
          <label>Critical days<input type="number" min="0" value={form.criticalDays} onChange={(e) => set("criticalDays", e.target.value)} /></label>
          <label>SNI hostname<input value={form.sniHost ?? ""} onChange={(e) => set("sniHost", e.target.value)} /></label>
          <label>Tags<input value={form.tagsText} onChange={(e) => set("tagsText", e.target.value)} placeholder="prod, mail, customer-a" /></label>
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
