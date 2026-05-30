import { useMemo, useState } from "react";
import { Copy, RefreshCw, Search, ShieldCheck, Siren, TimerReset, TriangleAlert } from "lucide-react";
import type { Monitor } from "../api/client";
import { collectsCertificate } from "../utils/monitorTypes";
import { formatDate } from "../utils/date";

export function Dashboard({ monitors, stats, query, setQuery, onSelect, onCheck, onClone }: any) {
  const [viewMode, setViewMode] = useState<"grouped" | "list">("grouped");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const filtered = monitors.filter((monitor: Monitor) =>
    [monitor.name, monitor.host, monitor.tags.join(" ")].join(" ").toLowerCase().includes(query.toLowerCase())
    && (!statusFilters.length || statusFilters.includes(monitor.lastStatus))
  );
  const groups = useMemo(() => groupMonitors(filtered), [filtered]);
  const statusCounts = useMemo(() => countStatuses(monitors), [monitors]);
  const allSelected = statusFilters.length === 0;

  const toggleStatus = (status: string) => {
    setStatusFilters((current) => current.length === 0 ? [status] : current.includes(status) ? current.filter((item) => item !== status) : [...current, status]);
  };

  return (
    <section className="content">
      <div className={`dashboard-hero hero-${heroTone(statusCounts)}`}>
        <div className="hero-copy">
          <span className="eyebrow">Overall health</span>
          <h2>{heroTitle(statusCounts)}</h2>
          <p>{heroDescription(statusCounts)}</p>
          <div className="hero-badges">
            <span className="filter-chip filter-ok active">OK {statusCounts.OK ?? 0}</span>
            <span className="filter-chip filter-warning active">Warnings {statusCounts.WARNING ?? 0}</span>
            <span className="filter-chip filter-critical active">Critical {(statusCounts.CRITICAL ?? 0) + (statusCounts.DOWN ?? 0)}</span>
            <span className="filter-chip filter-unknown active">Other {(statusCounts.PAUSED ?? 0) + (statusCounts.UNKNOWN ?? 0)}</span>
          </div>
        </div>
      </div>
      <div className="metrics dashboard-facts">
        <Metric icon={<ShieldCheck />} label="Valid" value={stats.ok ?? 0} tone="success" />
        <Metric icon={<TriangleAlert />} label="Expiring soon" value={stats.warning ?? 0} tone="warning" />
        <Metric icon={<Siren />} label="Critical" value={(stats.critical ?? 0) + (stats.down ?? 0)} tone="danger" />
        <Metric icon={<TimerReset />} label="Paused" value={stats.paused ?? 0} tone="secondary" />
      </div>
      <div className="panel toolbar-panel">
        <div>
          <h3>Monitors</h3>
          <p className="muted">{filtered.length} of {monitors.length} checks visible</p>
        </div>
        <div className="toolbar"><Search size={18} /><input placeholder="Search name, host, label, owner" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="dashboard-controls">
          <div className="btn-group btn-group-sm" role="group" aria-label="Dashboard view">
            <button type="button" className={`btn ${viewMode === "grouped" ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => setViewMode("grouped")}>Grouped</button>
            <button type="button" className={`btn ${viewMode === "list" ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => setViewMode("list")}>List</button>
          </div>
          <div className="status-filter" aria-label="Status filters">
            <button type="button" className={`filter-chip filter-all ${allSelected ? "active" : ""}`} onClick={() => setStatusFilters([])}>All</button>
            {statusOptions.map((item) => (
              <button type="button" className={`filter-chip filter-${item.status.toLowerCase()} ${statusFilters.includes(item.status) ? "active" : ""}`} key={item.status} onClick={() => toggleStatus(item.status)}>
                {item.label}<span>{statusCounts[item.status] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="monitor-checklist">
        {!filtered.length && <div className="empty-row"><strong>No monitors found</strong><span className="muted">Create a monitor to start checking certificates, services, or logins.</span></div>}
        {viewMode === "grouped" ? groups.map((group) => (
          <section className="monitor-group" key={group.name}>
            <div className="monitor-group-head">
              <div>
                <h3>{group.name}</h3>
                <p>{group.summary}</p>
              </div>
              <div className="group-badges">
                {statusOptions.slice(0, 4).map((item) => <span className={`mini-count mini-${item.status.toLowerCase()}`} key={item.status}><b>{item.short}</b>{group.counts[item.status] ?? 0}</span>)}
              </div>
            </div>
            {group.monitors.map((monitor: Monitor) => <MonitorRow monitor={monitor} onSelect={onSelect} onCheck={onCheck} onClone={onClone} key={monitor.id} />)}
          </section>
        )) : filtered.map((monitor: Monitor) => <MonitorRow monitor={monitor} onSelect={onSelect} onCheck={onCheck} onClone={onClone} key={monitor.id} />)}
      </div>
    </section>
  );
}

function MonitorRow({ monitor, onSelect, onCheck, onClone }: { monitor: Monitor; onSelect: (id: string) => void; onCheck: (id: string) => void; onClone: (id: string) => void }) {
  return (
    <div className={`monitor-row tone-${monitor.lastStatus.toLowerCase()}`} onClick={() => onSelect(monitor.id)}>
      <span className={`status-mark mark-${monitor.lastStatus.toLowerCase()}`}>{statusMark(monitor.lastStatus)}</span>
      <div className="monitor-main">
        <strong>{monitor.name}</strong>
        <span>{resultReason(monitor)}</span>
        <ProblemBadges monitor={monitor} />
      </div>
      <div className="monitor-target"><strong>{monitor.host}:{monitor.port}</strong><small>{monitor.type} - {monitor.tags.join(", ") || "unlabeled"}</small></div>
      <div className="monitor-cert"><span className="cert-line"><strong>{certificateSummary(monitor)}</strong><small>{certificateDetail(monitor)}</small>{gradePill(monitor)}{sslLabsPill(monitor)}</span></div>
      <div className="monitor-actions">
        <button className="btn btn-sm btn-outline-secondary monitor-action" title="Check now" aria-label={`Check ${monitor.name} now`} onClick={(e) => { e.stopPropagation(); onCheck(monitor.id); }}><RefreshCw size={14} /></button>
        <button className="btn btn-sm btn-outline-secondary monitor-action" title="Clone monitor" aria-label={`Clone ${monitor.name}`} onClick={(e) => { e.stopPropagation(); onClone(monitor.id); }}><Copy size={14} /></button>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, tone }: any) {
  return (
    <div className={`info-box shadow-sm metric-${tone}`}>
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

function ProblemBadges({ monitor }: { monitor: Monitor }) {
  const problems = problemSummary(monitor);
  if (!problems.length) return null;
  const visible = problems.slice(0, 1);
  const remaining = problems.length - visible.length;
  return (
    <span className="problem-list" title={problems.join("\n")}>
      {visible.map((problem) => <span className={`problem-chip problem-${problemTone(monitor.lastStatus)}`} key={problem}>{problem}</span>)}
      {remaining > 0 && <span className="problem-chip problem-more">+{remaining} more</span>}
    </span>
  );
}

const problemSummary = (monitor: Monitor) => [...new Set([
  ...(monitor.latestResult?.problems ?? []),
  ...(monitor.latestResult?.tlsGradeReasons ?? []).map((item) => `TLS grade: ${item.reason} (-${item.points})`),
  ...(monitor.latestResult?.sslLabsFindings ?? []),
  ...(monitor.latestResult?.dns?.mismatches ?? [])
].filter(Boolean))];

const resultReason = (monitor: Monitor) => {
  if (!monitor.enabled || monitor.lastStatus === "PAUSED") return "Paused. Scheduled checks and alerts are disabled.";
  if (monitor.latestResult?.message) return monitor.latestResult.message;
  if (monitor.lastStatus === "UNKNOWN") return "No check has run yet.";
  if (monitor.lastStatus === "OK") return "Last check completed without active problems.";
  return monitor.latestResult?.problems?.[0] ?? "No detailed reason was recorded for this status.";
};

const problemTone = (status: string) =>
  status === "WARNING" ? "warning" :
    status === "CRITICAL" || status === "DOWN" ? "danger" : "secondary";

const statusOptions = [
  { status: "OK", label: "Ok", short: "OK" },
  { status: "WARNING", label: "Warning", short: "W" },
  { status: "CRITICAL", label: "Critical", short: "C" },
  { status: "DOWN", label: "Down", short: "D" },
  { status: "PAUSED", label: "Paused", short: "P" },
  { status: "UNKNOWN", label: "Unknown", short: "?" }
];

const countStatuses = (monitors: Monitor[]) =>
  monitors.reduce<Record<string, number>>((acc, monitor) => ({ ...acc, [monitor.lastStatus]: (acc[monitor.lastStatus] ?? 0) + 1 }), {});

const heroTone = (counts: Record<string, number>) =>
  (counts.CRITICAL ?? 0) + (counts.DOWN ?? 0) ? "critical" : (counts.WARNING ?? 0) ? "warning" : "ok";

const heroTitle = (counts: Record<string, number>) =>
  heroTone(counts) === "critical" ? "Attention required" : heroTone(counts) === "warning" ? "Mostly healthy, watch warnings" : "All monitored checks look healthy";

const heroDescription = (counts: Record<string, number>) =>
  heroTone(counts) === "critical"
    ? "Critical or down monitors need action before customers notice service or certificate problems."
    : heroTone(counts) === "warning"
      ? "The platform is operating, but some checks are approaching thresholds or changed state."
      : "Certificate, service, and login checks are currently inside their expected operating range.";

const statusMark = (status: string) => ({ OK: "OK", WARNING: "!", CRITICAL: "X", DOWN: "X", PAUSED: "II", UNKNOWN: "?" }[status] ?? "?");

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
    summary: summaryFor(items),
    counts: countStatuses(items)
  }));
};

const rollupStatus = (monitors: Monitor[]) =>
  monitors.map((monitor) => monitor.lastStatus).sort((a, b) => statusRank(b) - statusRank(a))[0] ?? "UNKNOWN";

const statusRank = (status: string) => ({ DOWN: 5, CRITICAL: 4, WARNING: 3, UNKNOWN: 2, PAUSED: 1, OK: 0 }[status] ?? 2);
const summaryFor = (monitors: Monitor[]) => {
  const counts = monitors.reduce<Record<string, number>>((acc, monitor) => ({ ...acc, [monitor.lastStatus]: (acc[monitor.lastStatus] ?? 0) + 1 }), {});
  return [`${counts.OK ?? 0} OK`, `${counts.WARNING ?? 0} warning`, `${(counts.CRITICAL ?? 0) + (counts.DOWN ?? 0)} critical/down`].join(" - ");
};
