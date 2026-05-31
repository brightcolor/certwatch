import { useState } from "react";
import { Copy } from "lucide-react";
import type { CheckResult, Incident, Monitor } from "../api/client";
import { StatusPill } from "../components/StatusPill";
import { certificateUnavailableMessage, collectsCertificate } from "../utils/monitorTypes";
import { formatDateTime } from "../utils/date";

type MonitorDetailProps = {
  monitor: Monitor;
  results: CheckResult[];
  incidents: Incident[];
  onBack: () => void;
  onEdit: () => void;
  onCheck: () => void;
  onClone: () => void;
  onToggleEnabled: () => void;
  onDelete: () => void;
  onSslLabs: () => Promise<any>;
  onAck: (id: string, assignee: string) => Promise<void>;
  onNote: (id: string, text: string) => Promise<void>;
};

export function MonitorDetail({ monitor, results, incidents, onBack, onEdit, onCheck, onClone, onToggleEnabled, onDelete, onSslLabs, onAck, onNote }: MonitorDetailProps) {
  const [assignee, setAssignee] = useState("");
  const [note, setNote] = useState("");
  const [sslLabsState, setSslLabsState] = useState({ busy: false, message: "" });
  const latest = results[0] ?? monitor.latestResult;
  const origin = window.location.origin;
  const statusTag = monitor.tags[0] ?? "all";
  const badgeUrl = `${origin}/public/badge/${monitor.id}.svg`;
  const aliasBadgeUrl = `${badgeUrl}?label=${encodeURIComponent(shortBadgeLabel(monitor.name))}`;
  const statusUrl = `${origin}/public/status/${encodeURIComponent(statusTag)}.html`;
  const markdownBadge = `[![${monitor.name}](${aliasBadgeUrl})](${statusUrl})`;
  const htmlBadge = `<a href="${statusUrl}"><img src="${aliasBadgeUrl}" alt="${escapeHtmlAttr(monitor.name)} status"></a>`;
  const hasCertificateDetails = Boolean(latest?.fingerprintSha256 || latest?.commonName || latest?.validUntil || latest?.tlsVersion || (latest?.chain?.length ?? 0) > 0);
  const certificateExpected = collectsCertificate(monitor.type, monitor.config, monitor.port);
  const canTriggerSslLabs = ["https", "tls", "http", "http_login"].includes(monitor.type) && monitor.port === 443;
  const triggerSslLabs = async () => {
    setSslLabsState({ busy: true, message: "SSL Labs assessment running..." });
    try {
      const result = await onSslLabs();
      setSslLabsState({ busy: false, message: `SSL Labs ${sslLabsSummary(result?.assessment)}` });
    } catch (error) {
      setSslLabsState({ busy: false, message: error instanceof Error ? error.message : "SSL Labs trigger failed." });
    }
  };

  return (
    <section className="content">
      <div className="detail-hero">
        <button className="btn btn-outline-secondary btn-sm" onClick={onBack}>Back</button>
        <div className="detail-head">
          <div>
            <StatusPill status={monitor.lastStatus} />
            <h2>{monitor.name}</h2>
            <p>{monitor.host}:{monitor.port} - {monitor.type}</p>
            <small>{monitor.tags.join(", ") || "unlabeled"}</small>
          </div>
          <div className="actions">
            <button className="btn btn-primary" disabled={!monitor.enabled} onClick={onCheck}>Check now</button>
            {canTriggerSslLabs && <button className="btn btn-outline-secondary" disabled={sslLabsState.busy} onClick={triggerSslLabs}>SSL Labs</button>}
            <button className={`btn ${monitor.enabled ? "btn-outline-warning warning" : "btn-success success"}`} onClick={onToggleEnabled}>{monitor.enabled ? "Pause" : "Resume"}</button>
            <button className="btn btn-outline-secondary" onClick={onClone}><Copy size={16} /> Clone</button>
            <button className="btn btn-outline-secondary" onClick={onEdit}>Edit</button>
            <button className="btn btn-outline-danger danger" onClick={() => { if (confirm(`Delete monitor "${monitor.name}"?`)) onDelete(); }}>Delete</button>
          </div>
        </div>
        {sslLabsState.message && <p className="muted">{sslLabsState.message}</p>}
      </div>
      {hasCertificateDetails ? <div className="grid two">
          <Panel title="Certificate">
            <Info label="Common Name" value={latest?.commonName} />
            <Info label="Issuer" value={latest?.issuer} />
            <Info label="Serial Number" value={latest?.serialNumber} />
            <Info label="SHA256 Fingerprint" value={latest?.fingerprintSha256} />
            <Info label="Valid From" value={dateTime(latest?.validFrom)} />
            <Info label="Valid Until" value={dateTime(latest?.validUntil)} />
            <Info label="Days Remaining" value={latest?.daysRemaining?.toString()} />
            <Info label="SANs" value={latest?.subjectAltNames.join(", ")} />
          </Panel>
          <ResultPanel latest={latest} title="TLS" />
        </div> : <div className="grid two">
          <Panel title={certificateExpected ? "Certificate unavailable" : "Service check"}>
            <EmptyHint title={certificateExpected ? "No certificate details in the latest result" : "This monitor does not collect certificates"} text={certificateUnavailableMessage(monitor.type, monitor.config, monitor.port)} />
          </Panel>
          <ResultPanel latest={latest} title="Latest result" />
        </div>}
      {hasCertificateDetails && <Panel title="Certificate Chain">
        {(latest?.chain ?? []).length ? (latest?.chain ?? []).map((item, index) => <div className="chain" key={item.fingerprintSha256 ?? index}><strong>{index + 1}. {item.subject}</strong><span>{item.issuer}</span><small>{dateTime(item.validUntil)}</small></div>) : <span className="muted">No certificate chain was returned by the target.</span>}
      </Panel>}
      <DnsPanel result={latest} />
      <Panel title="Embed">
        <EmbedRow label="Badge URL" value={badgeUrl} />
        <EmbedRow label="Alias Badge URL" value={aliasBadgeUrl} />
        <EmbedRow label="Markdown" value={markdownBadge} />
        <EmbedRow label="HTML" value={htmlBadge} />
      </Panel>
      <Panel title="Incident Timeline">
        <div className="stack-list">
          {incidents.map((incident) => <div key={incident.id}><StatusPill status={incident.status} /><span>{incident.message}</span><small>{dateTime(incident.startedAt)} - {incident.resolvedAt ? dateTime(incident.resolvedAt) : "open"}{incident.acknowledgedAt ? ` - ack ${dateTime(incident.acknowledgedAt)}` : ""}</small></div>)}
          {!incidents.length && <span className="muted">No incidents recorded for this monitor.</span>}
        </div>
        {incidents[0] && !incidents[0].resolvedAt && <div className="grid two">
          <label>Assignee<input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Team or person" /></label>
          <button onClick={() => onAck(incidents[0].id, assignee)}>Acknowledge latest</button>
          <label>Note<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened?" /></label>
          <button onClick={async () => { await onNote(incidents[0].id, note); setNote(""); }}>Add note</button>
        </div>}
        {incidents[0]?.notes?.length > 0 && <div className="stack-list">{incidents[0].notes.map((item) => <div key={item.id}><strong>{item.author}</strong><span>{item.text}</span><small>{dateTime(item.createdAt)}</small></div>)}</div>}
      </Panel>
      <Panel title="Check History">
        <div className="stack-list">{results.map((result) => <div key={result.id}><StatusPill status={result.status} /><span>{dateTime(result.checkedAt)}</span><span>{result.message}</span></div>)}</div>
      </Panel>
    </section>
  );
}

function Panel({ title, children }: any) {
  return <div className="panel"><h3>{title}</h3>{children}</div>;
}

function ResultPanel({ latest, title }: { latest?: CheckResult | null; title: string }) {
  return <Panel title={title}>
    <Info label="Status Reason" value={resultReason(latest)} />
    <Info label="Security Grade" value={latest?.tlsGrade ? `${latest.tlsGrade} (${latest.tlsScore ?? 0}/100)` : "-"} />
    <GradeReasons reasons={latest?.tlsGradeReasons ?? []} />
    <Info label="SSL Labs Grade" value={latest?.sslLabsGrade ? `${latest.sslLabsGrade} (${latest.sslLabsStatus ?? "ready"})` : latest?.sslLabsStatus} />
    <Info label="SSL Labs Check" value={dateTime(latest?.sslLabsCheckedAt)} />
    {latest?.sslLabsUrl && <Info label="SSL Labs URL" value={latest.sslLabsUrl} />}
    <Info label="Version" value={latest?.tlsVersion} />
    <Info label="Supported Versions" value={(latest?.tlsSupportedVersions ?? []).join(", ")} />
    <Info label="Cipher Suite" value={latest?.cipherSuite} />
    <Info label="Flapping" value={latest?.flapping ? "Detected" : "No"} />
    <Info label="Last Check" value={dateTime(latest?.checkedAt)} />
    <Info label="Duration" value={latest ? `${latest.durationMs} ms` : ""} />
    <Info label="Problems" value={[...(latest?.problems ?? []), ...(latest?.sslLabsFindings ?? [])].join("; ") || "None"} />
  </Panel>;
}

function GradeReasons({ reasons }: { reasons: Array<{ reason: string; points: number }> }) {
  if (!reasons.length) return <Info label="TLS Grade Reasons" value="No deductions recorded." />;
  return <div className="info stacked-info"><span>TLS Grade Reasons</span><strong>{reasons.map((item) => `${item.reason} (-${item.points})`).join(" ")}</strong></div>;
}

function resultReason(latest?: CheckResult | null) {
  if (!latest) return "No check result has been recorded yet.";
  if (latest.message) return latest.message;
  if (latest.status === "OK") return "Last check completed without active problems.";
  return latest.problems[0] ?? "No detailed reason was recorded for this status.";
}

function DnsPanel({ result }: { result?: CheckResult | null }) {
  const dns = result?.dns;
  if (!dns) {
    return <Panel title="DNS resolution"><span className="muted">No DNS resolution sample has been collected yet. Run a check to resolve the hostname and compare public resolvers.</span></Panel>;
  }
  return <Panel title="DNS resolution">
    <Info label="Resolved IPs" value={dns.addresses.join(", ")} />
    <Info label="Authoritative zone" value={dns.authoritativeZone} />
    <Info label="Authoritative nameservers" value={dns.authoritativeNameservers.join(", ")} />
    <Info label="DNS checked" value={`${dateTime(dns.checkedAt)}${dns.fresh ? "" : " (cached)"}`} />
    {!!dns.mismatches.length && <div className="callout callout-warning"><strong>Resolver differences detected</strong><p>{dns.mismatches.join(" ")}</p></div>}
    <div className="stack-list">
      {dns.checks.map((check) => (
        <div key={`${check.kind}-${check.name}`}>
          <strong>{check.name}</strong>
          <span>{check.addresses.join(", ") || check.error || "No records"}</span>
          {!!check.servers.length && <small>{check.servers.join(", ")}</small>}
        </div>
      ))}
    </div>
  </Panel>;
}

function EmptyHint({ title, text }: { title: string; text: string }) {
  return <div className="empty-state compact"><strong>{title}</strong><span className="muted">{text}</span></div>;
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return <div className="info"><span>{label}</span><strong>{value || "-"}</strong></div>;
}

function EmbedRow({ label, value }: { label: string; value: string }) {
  return <div className="info embed-row"><span>{label}</span><code>{value}</code><button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => navigator.clipboard?.writeText(value)}>Copy</button></div>;
}

const dateTime = formatDateTime;
const shortBadgeLabel = (value: string) => value.trim() || "Monitor";
const escapeHtmlAttr = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const sslLabsSummary = (assessment: any) => assessment?.sslLabsGrade ? `grade ${assessment.sslLabsGrade}` : assessment?.sslLabsStatus ? `status ${assessment.sslLabsStatus}` : "assessment completed";
