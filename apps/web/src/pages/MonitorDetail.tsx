import type { CheckResult, Monitor } from "../api/client";
import { StatusPill } from "../components/StatusPill";

export function MonitorDetail({ monitor, results, onBack, onEdit, onCheck }: { monitor: Monitor; results: CheckResult[]; onBack: () => void; onEdit: () => void; onCheck: () => void }) {
  const latest = results[0] ?? monitor.latestResult;
  return (
    <section className="content">
      <button className="ghost" onClick={onBack}>Back</button>
      <div className="detail-head">
        <div><h2>{monitor.name}</h2><p>{monitor.host}:{monitor.port} · {monitor.type}</p></div>
        <div className="actions"><StatusPill status={monitor.lastStatus} /><button onClick={onCheck}>Check now</button><button onClick={onEdit}>Edit</button></div>
      </div>
      <div className="grid two">
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
        <Panel title="TLS">
          <Info label="Version" value={latest?.tlsVersion} />
          <Info label="Cipher Suite" value={latest?.cipherSuite} />
          <Info label="Last Check" value={dateTime(latest?.checkedAt)} />
          <Info label="Duration" value={latest ? `${latest.durationMs} ms` : ""} />
          <Info label="Problems" value={latest?.problems.join("; ") || "None"} />
        </Panel>
      </div>
      <Panel title="Certificate Chain">
        {(latest?.chain ?? []).map((item, index) => <div className="chain" key={item.fingerprintSha256 ?? index}><strong>{index + 1}. {item.subject}</strong><span>{item.issuer}</span><small>{dateTime(item.validUntil)}</small></div>)}
      </Panel>
      <Panel title="Check History">
        <div className="history">{results.map((result) => <div key={result.id}><StatusPill status={result.status} /><span>{dateTime(result.checkedAt)}</span><span>{result.message}</span></div>)}</div>
      </Panel>
    </section>
  );
}

function Panel({ title, children }: any) {
  return <div className="panel"><h3>{title}</h3>{children}</div>;
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return <div className="info"><span>{label}</span><strong>{value || "-"}</strong></div>;
}

const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString() : "";
