import { useState } from "react";
import type { CheckResult, Incident, Monitor } from "../api/client";
import { StatusPill } from "../components/StatusPill";
import { certificateUnavailableMessage, collectsCertificate } from "../utils/monitorTypes";

export function MonitorDetail({ monitor, results, incidents, onBack, onEdit, onCheck, onDelete, onAck, onNote }: { monitor: Monitor; results: CheckResult[]; incidents: Incident[]; onBack: () => void; onEdit: () => void; onCheck: () => void; onDelete: () => void; onAck: (id: string, assignee: string) => Promise<void>; onNote: (id: string, text: string) => Promise<void> }) {
  const [assignee, setAssignee] = useState("");
  const [note, setNote] = useState("");
  const latest = results[0] ?? monitor.latestResult;
  const origin = window.location.origin;
  const statusTag = monitor.tags[0] ?? "all";
  const badgeUrl = `${origin}/public/badge/${monitor.id}.svg`;
  const statusUrl = `${origin}/public/status/${encodeURIComponent(statusTag)}.html`;
  const markdownBadge = `[![${monitor.name}](${badgeUrl})](${statusUrl})`;
  const htmlBadge = `<a href="${statusUrl}"><img src="${badgeUrl}" alt="${monitor.name} status"></a>`;
  const hasCertificateDetails = Boolean(latest?.fingerprintSha256 || latest?.commonName || latest?.validUntil || latest?.tlsVersion || (latest?.chain?.length ?? 0) > 0);
  const certificateExpected = collectsCertificate(monitor.type, monitor.config, monitor.port);

  return (
    <section className="content">
      <div className="detail-hero">
        <button className="ghost" onClick={onBack}>Back</button>
        <div className="detail-head">
          <div>
            <StatusPill status={monitor.lastStatus} />
            <h2>{monitor.name}</h2>
            <p>{monitor.host}:{monitor.port} - {monitor.type}</p>
            <small>{monitor.tags.join(", ") || "unlabeled"}</small>
          </div>
          <div className="actions"><button onClick={onCheck}>Check now</button><button onClick={onEdit}>Edit</button><button className="ghost danger" onClick={() => { if (confirm(`Delete monitor "${monitor.name}"?`)) onDelete(); }}>Delete</button></div>
        </div>
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
      <Panel title="Embed">
        <EmbedRow label="Badge URL" value={badgeUrl} />
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
    <Info label="Security Grade" value={latest?.tlsGrade ? `${latest.tlsGrade} (${latest.tlsScore ?? 0}/100)` : "-"} />
    <Info label="Version" value={latest?.tlsVersion} />
    <Info label="Cipher Suite" value={latest?.cipherSuite} />
    <Info label="Flapping" value={latest?.flapping ? "Detected" : "No"} />
    <Info label="Last Check" value={dateTime(latest?.checkedAt)} />
    <Info label="Duration" value={latest ? `${latest.durationMs} ms` : ""} />
    <Info label="Problems" value={latest?.problems.join("; ") || "None"} />
  </Panel>;
}

function EmptyHint({ title, text }: { title: string; text: string }) {
  return <div className="empty-state compact"><strong>{title}</strong><span className="muted">{text}</span></div>;
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return <div className="info"><span>{label}</span><strong>{value || "-"}</strong></div>;
}

function EmbedRow({ label, value }: { label: string; value: string }) {
  return <div className="info embed-row"><span>{label}</span><code>{value}</code><button type="button" onClick={() => navigator.clipboard?.writeText(value)}>Copy</button></div>;
}

const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString() : "";
