import { Fragment } from "react";
import { Search, ShieldCheck, Siren, TimerReset, TriangleAlert } from "lucide-react";
import type { Monitor } from "../api/client";
import { StatusPill } from "../components/StatusPill";
import { collectsCertificate } from "../utils/monitorTypes";
import { formatDate } from "../utils/date";

export function Dashboard({ monitors, stats, query, setQuery, onSelect, onCheck }: any) {
  const filtered = monitors.filter((monitor: Monitor) =>
    [monitor.name, monitor.host, monitor.tags.join(" ")].join(" ").toLowerCase().includes(query.toLowerCase())
  );
  const groups = groupMonitors(filtered);

  return (
    <section className="content">
      <div className="metrics">
        <Metric icon={<ShieldCheck />} label="Valid" value={stats.ok ?? 0} />
        <Metric icon={<TriangleAlert />} label="Expiring soon" value={stats.warning ?? 0} />
        <Metric icon={<Siren />} label="Critical" value={(stats.critical ?? 0) + (stats.down ?? 0)} />
        <Metric icon={<TimerReset />} label="Paused" value={stats.paused ?? 0} />
      </div>
      <div className="panel toolbar-panel">
        <div>
          <h3>Monitors</h3>
          <p className="muted">{filtered.length} of {monitors.length} checks visible</p>
        </div>
        <div className="toolbar"><Search size={18} /><input placeholder="Search name, host, label, owner" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      </div>
      <div className="table">
        <div className="row head"><span>Status</span><span>Check</span><span>Target</span><span>Certificate</span><span>Last result</span><span></span></div>
        {!filtered.length && <div className="empty-row"><strong>No monitors found</strong><span className="muted">Create a monitor to start checking certificates, services, or logins.</span></div>}
        {groups.map((group) => (
          <Fragment key={group.name}>
            <div className="group-row">
              <div><StatusPill status={group.status} /><strong>{group.name}</strong><span>{group.monitors.length} monitor{group.monitors.length === 1 ? "" : "s"}</span></div>
              <small>{group.summary}</small>
            </div>
            {group.monitors.map((monitor: Monitor) => (
              <div className="row" key={monitor.id} onClick={() => onSelect(monitor.id)}>
                <span><StatusPill status={monitor.lastStatus} /></span>
                <span><strong>{monitor.name}</strong><small>{monitor.tags.join(", ") || "unlabeled"}</small></span>
                <span>{monitor.host}:{monitor.port}<small>{monitor.type}</small></span>
                <span>{certificateSummary(monitor)}{gradePill(monitor)}{sslLabsPill(monitor)}<small>{certificateDetail(monitor)}</small></span>
                <span>{monitor.latestResult?.message ?? "No result yet"}<small>{monitor.latestResult?.tlsVersion ?? ""}</small></span>
                <span><button onClick={(e) => { e.stopPropagation(); onCheck(monitor.id); }}>Check now</button></span>
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: any) {
  return (
    <div className="info-box shadow-sm">
      <span className="info-box-icon">{icon}</span>
      <div className="info-box-content">
        <span className="info-box-text">{label}</span>
        <span className="info-box-number">{value}</span>
      </div>
    </div>
  );
}

const certificateSummary = (monitor: Monitor) => {
  if (!collectsCertificate(monitor.type, monitor.config, monitor.port)) return "Service check";
  return monitor.latestResult?.daysRemaining === null || monitor.latestResult?.daysRemaining === undefined ? "-" : `${monitor.latestResult.daysRemaining} days`;
};
const certificateDetail = (monitor: Monitor) => {
  if (!collectsCertificate(monitor.type, monitor.config, monitor.port)) return "no certificate collected";
  return [formatDate(monitor.latestResult?.validUntil), monitor.latestResult?.tlsVersion].filter(Boolean).join(" - ");
};

const gradePill = (monitor: Monitor) =>
  monitor.latestResult?.tlsGrade ? <span className={`grade-pill grade-${monitor.latestResult.tlsGrade.toLowerCase().slice(0, 1)}`}>TLS {monitor.latestResult.tlsGrade}</span> : null;

const sslLabsPill = (monitor: Monitor) =>
  monitor.latestResult?.sslLabsGrade ? <span className={`grade-pill grade-${monitor.latestResult.sslLabsGrade.toLowerCase().slice(0, 1)}`}>SSL Labs {monitor.latestResult.sslLabsGrade}</span> : null;

const groupMonitors = (monitors: Monitor[]) => {
  const buckets = new Map<string, Monitor[]>();
  for (const monitor of monitors) {
    const group = monitor.tags[0] || "unlabeled";
    buckets.set(group, [...(buckets.get(group) ?? []), monitor]);
  }
  return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, items]) => ({
    name,
    monitors: items,
    status: rollupStatus(items),
    summary: summaryFor(items)
  }));
};

const rollupStatus = (monitors: Monitor[]) =>
  monitors.map((monitor) => monitor.lastStatus).sort((a, b) => statusRank(b) - statusRank(a))[0] ?? "UNKNOWN";

const statusRank = (status: string) => ({ DOWN: 5, CRITICAL: 4, WARNING: 3, UNKNOWN: 2, PAUSED: 1, OK: 0 }[status] ?? 2);
const summaryFor = (monitors: Monitor[]) => {
  const counts = monitors.reduce<Record<string, number>>((acc, monitor) => ({ ...acc, [monitor.lastStatus]: (acc[monitor.lastStatus] ?? 0) + 1 }), {});
  return [`${counts.OK ?? 0} OK`, `${counts.WARNING ?? 0} warning`, `${(counts.CRITICAL ?? 0) + (counts.DOWN ?? 0)} critical/down`].join(" - ");
};
