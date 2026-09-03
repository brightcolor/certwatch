import { useMemo, useState } from "react";
import { Check, CircleHelp, Copy, HeartPulse, Pause, PauseCircle, Play, Plus, RefreshCw, Search, ShieldCheck, Siren, TriangleAlert, Unplug, X } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import type { Monitor } from "../api/client";
import { collectsCertificate } from "../utils/monitorTypes";
import { formatDate } from "../utils/date";

export function Dashboard({ monitors, loaded, stats, query, setQuery, onSelect, onCheck, onClone, onToggleEnabled, onNew }: any) {
  const [viewMode, setViewMode] = useState<"grouped" | "list">("list");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [issueFilters, setIssueFilters] = useState<string[]>([]);
  const [expandedIssueMonitor, setExpandedIssueMonitor] = useState<string | null>(null);
  const filtered = monitors.filter((monitor: Monitor) =>
    [monitor.name, monitor.host, monitor.tags.join(" ")].join(" ").toLowerCase().includes(query.toLowerCase())
    && (!statusFilters.length || statusFilters.includes(monitor.lastStatus))
    && (!issueFilters.length || issueFilters.some((issue) => issueTexts(monitor).includes(issue)))
  );
  const groups = useMemo(() => groupMonitors(filtered), [filtered]);
  const statusCounts = useMemo(() => countStatuses(monitors), [monitors]);
  const summaryCounts = useMemo(() => summaryFrom(statusCounts), [statusCounts]);
  const allSelected = statusFilters.length === 0;

  const toggleStatus = (status: string) => {
    setStatusFilters((current) => current.length === 0 ? [status] : current.includes(status) ? current.filter((item) => item !== status) : [...current, status]);
  };
  const setOnlyStatuses = (statuses: string[]) => setStatusFilters(statuses);
  const toggleIssue = (issue: string) => {
    setIssueFilters((current) => current.includes(issue) ? current.filter((item) => item !== issue) : [...current, issue]);
  };
  const toggleExpandedIssues = (monitorId: string) => setExpandedIssueMonitor((current) => current === monitorId ? null : monitorId);

  if (!loaded) {
    return <section className="content"><Skeleton /></section>;
  }

  if (!monitors.length) {
    return (
      <section className="content">
        <EmptyState
          icon={<ShieldCheck size={24} />}
          title="Add your first check"
          text="Point crt.watch at a hostname and it starts watching the certificate, the service behind it, and the login if you need one. You get told before anything expires."
          action={<button className="btn btn-primary" type="button" onClick={onNew}><Plus size={16} /> New monitor</button>}
          hint="Have a list already? Import several at once from the Import page."
        />
      </section>
    );
  }

  return (
    <section className="content">
      <div className={`status-hero tone-${heroTone(statusCounts)}`}>
        <div className="health-ring" style={{ "--share": `${healthShare(statusCounts)}%` } as any} role="img" aria-label={`${healthShare(statusCounts)} percent of checks healthy`}>
          <div className="health-ring-inner">
            <span className="health-ring-value">{healthShare(statusCounts)}</span>
            <span className="health-ring-sub">% healthy</span>
          </div>
        </div>
        <div className="hero-copy">
          <h2>{heroTitle(statusCounts)}</h2>
          <p>{heroDescription(statusCounts)}</p>
        </div>
        <div className="stats-bar">
          {summaryCounts.map((item) => (
            <button
              type="button"
              className={`stat-item tone-${item.tone}${item.value ? "" : " is-zero"}${sameSelection(statusFilters, item.statuses) ? " active" : ""}`}
              key={item.label}
              aria-pressed={sameSelection(statusFilters, item.statuses)}
              onClick={() => setOnlyStatuses(item.statuses)}
            >
              <span className="stat-icon" aria-hidden="true">{item.icon}</span>
              <span className="stat-value">{item.value}</span>
              <span className="stat-label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="panel toolbar-panel">
        <div>
          <h3>Monitors</h3>
          <p className="muted">{filtered.length} of {monitors.length} checks visible</p>
        </div>
        <div className="toolbar"><Search size={16} /><input placeholder="Search name, host, label, owner" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="dashboard-controls">
          <div className="status-filter" aria-label="Status filters">
            <button type="button" className={`filter-chip filter-all ${allSelected ? "active" : ""}`} onClick={() => setStatusFilters([])}>All</button>
            {statusOptions.map((item) => (
              <button type="button" className={`filter-chip filter-${item.status.toLowerCase()} ${statusFilters.includes(item.status) ? "active" : ""}`} key={item.status} onClick={() => toggleStatus(item.status)}>
                {item.label}<span>{statusCounts[item.status] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="btn-group btn-group-sm" role="group" aria-label="Dashboard view">
            <button type="button" className={`btn ${viewMode === "grouped" ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => setViewMode("grouped")}>Grouped</button>
            <button type="button" className={`btn ${viewMode === "list" ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => setViewMode("list")}>List</button>
          </div>
        </div>
        {!!issueFilters.length && <div className="issue-filter-bar">
          <span className="muted">Issue filter</span>
          {issueFilters.map((issue) => <button type="button" className="issue-filter-chip" key={issue} onClick={() => toggleIssue(issue)}>{issue}</button>)}
          <button type="button" className="issue-filter-clear" onClick={() => setIssueFilters([])}>Clear issues</button>
        </div>}
      </div>
      <div className="monitor-checklist">
        {!filtered.length && <div className="empty-row"><strong>Nothing matches these filters</strong><span className="muted">Clear the search or pick a different status to see the rest of your checks.</span></div>}
        {viewMode === "list" && filtered.length > 0 && (
          <div className="monitor-list-head" aria-hidden="true">
            <span />
            <span>Monitor</span>
            <span>Target</span>
            <span className="head-cert">Certificate</span>
            <span>Actions</span>
          </div>
        )}
        {viewMode === "grouped" ? groups.map((group) => (
          <section className="monitor-group" key={group.name}>
            <div className={`monitor-group-head tone-${group.status.toLowerCase()}`}>
              <div>
                <h3>{group.name}</h3>
                <p>{group.summary}</p>
              </div>
              <div className="group-badges">
                {statusOptions.slice(0, 4).filter((item) => group.counts[item.status]).map((item) => (
                  <button type="button" className={`mini-count mini-${item.status.toLowerCase()}`} key={item.status} title={item.label} onClick={() => setOnlyStatuses([item.status])}>
                    {group.counts[item.status]} {item.label.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            {group.monitors.map((monitor: Monitor) => <MonitorRow monitor={monitor} onSelect={onSelect} onCheck={onCheck} onClone={onClone} onToggleEnabled={onToggleEnabled} onStatus={toggleStatus} onIssue={toggleIssue} onMoreIssues={toggleExpandedIssues} issueFilters={issueFilters} expandedIssues={expandedIssueMonitor === monitor.id} key={monitor.id} />)}
          </section>
        )) : filtered.map((monitor: Monitor) => <MonitorRow monitor={monitor} onSelect={onSelect} onCheck={onCheck} onClone={onClone} onToggleEnabled={onToggleEnabled} onStatus={toggleStatus} onIssue={toggleIssue} onMoreIssues={toggleExpandedIssues} issueFilters={issueFilters} expandedIssues={expandedIssueMonitor === monitor.id} key={monitor.id} />)}
      </div>
    </section>
  );
}

function MonitorRow({ monitor, onSelect, onCheck, onClone, onToggleEnabled, onStatus, onIssue, onMoreIssues, issueFilters, expandedIssues }: { monitor: Monitor; onSelect: (id: string) => void; onCheck: (id: string) => void; onClone: (id: string) => void; onToggleEnabled: (monitor: Monitor) => void; onStatus: (status: string) => void; onIssue: (issue: string) => void; onMoreIssues: (id: string) => void; issueFilters: string[]; expandedIssues: boolean }) {
  const reason = resultReason(monitor);
  return (
    <div
      className={`monitor-row tone-${monitor.lastStatus.toLowerCase()}`}
      role="button"
      tabIndex={0}
      aria-label={`Open ${monitor.name}`}
      onClick={() => onSelect(monitor.id)}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(monitor.id); } }}
    >
      <button type="button" className={`status-mark mark-${monitor.lastStatus.toLowerCase()}`} onClick={(event) => { event.stopPropagation(); onStatus(monitor.lastStatus); }}>{statusMark(monitor.lastStatus)}</button>
      <div className="monitor-main">
        <strong>{monitor.name}</strong>
        <button type="button" className="message-filter" title="Filter by this message" onClick={(event) => { event.stopPropagation(); onIssue(reason); }}>{reason}</button>
        <ProblemBadges monitor={monitor} onIssue={onIssue} onMoreIssues={onMoreIssues} issueFilters={issueFilters} expanded={expandedIssues} />
      </div>
      <div className="monitor-target"><strong>{monitor.host}:{monitor.port}</strong><small>{monitor.type} - {monitor.tags.join(", ") || "unlabeled"}</small></div>
      <div className={`monitor-cert tone-${monitor.lastStatus.toLowerCase()}`}>
        <span className="cert-line"><strong>{certificateSummary(monitor)}</strong>{gradePill(monitor)}{sslLabsPill(monitor)}</span>
        <LifetimeMeter monitor={monitor} />
        <small>{certificateDetail(monitor)}</small>
      </div>
      <div className="monitor-actions">
        <button className="btn btn-sm btn-outline-secondary monitor-action" title={monitor.enabled ? "Pause monitor" : "Resume monitor"} aria-label={`${monitor.enabled ? "Pause" : "Resume"} ${monitor.name}`} onClick={(e) => { e.stopPropagation(); onToggleEnabled(monitor); }}>{monitor.enabled ? <Pause size={14} /> : <Play size={14} />}</button>
        <button className="btn btn-sm btn-outline-secondary monitor-action" disabled={!monitor.enabled} title={monitor.enabled ? "Check now" : "Resume before running checks"} aria-label={`Check ${monitor.name} now`} onClick={(e) => { e.stopPropagation(); onCheck(monitor.id); }}><RefreshCw size={14} /></button>
        <button className="btn btn-sm btn-outline-secondary monitor-action" title="Clone monitor" aria-label={`Clone ${monitor.name}`} onClick={(e) => { e.stopPropagation(); onClone(monitor.id); }}><Copy size={14} /></button>
      </div>
    </div>
  );
}

/* The strip counters and the filter chips read the same source, so the same
   monitor is never counted differently in two places on one screen. */
const summaryFrom = (counts: Record<string, number>) => [
  { label: "Valid", tone: "ok", statuses: ["OK"], value: counts.OK ?? 0, icon: <ShieldCheck size={15} /> },
  { label: "Expiring soon", tone: "warning", statuses: ["WARNING"], value: counts.WARNING ?? 0, icon: <TriangleAlert size={15} /> },
  { label: "Critical", tone: "critical", statuses: ["CRITICAL", "DOWN"], value: (counts.CRITICAL ?? 0) + (counts.DOWN ?? 0), icon: <Siren size={15} /> },
  { label: "Paused", tone: "paused", statuses: ["PAUSED", "UNKNOWN"], value: (counts.PAUSED ?? 0) + (counts.UNKNOWN ?? 0), icon: <PauseCircle size={15} /> }
];

/* The ring shows the share of checks that are currently fine. Paused and
   never-checked monitors count as neither healthy nor broken, so they are left
   out of the denominator rather than dragging the number down. */
const healthShare = (counts: Record<string, number>) => {
  const ok = counts.OK ?? 0;
  const rated = ok + (counts.WARNING ?? 0) + (counts.CRITICAL ?? 0) + (counts.DOWN ?? 0);
  return rated ? Math.round((ok / rated) * 100) : 100;
};

const sameSelection = (current: string[], statuses: string[]) =>
  current.length === statuses.length && statuses.every((status) => current.includes(status));

/* Days left only mean something next to the thresholds this monitor was given.
   The bar fills against three times the warning window, so the same "41 days"
   reads as comfortable on a yearly certificate and tight on a short one. */
function LifetimeMeter({ monitor }: { monitor: Monitor }) {
  const days = monitor.latestResult?.daysRemaining;
  if (!collectsCertificate(monitor.type, monitor.config, monitor.port) || days === null || days === undefined) return null;
  const span = Math.max(monitor.warningDays || 30, 1) * 3;
  const fill = Math.max(0, Math.min(1, days / span));
  return <span className="lifetime-meter" style={{ "--fill": `${Math.round(fill * 100)}%` } as any} aria-hidden="true"><i /></span>;
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

function ProblemBadges({ monitor, onIssue, onMoreIssues, issueFilters, expanded }: { monitor: Monitor; onIssue: (issue: string) => void; onMoreIssues: (id: string) => void; issueFilters: string[]; expanded: boolean }) {
  const problems = problemSummary(monitor);
  if (!problems.length) return null;
  const visible = expanded ? problems : problems.slice(0, 1);
  const remaining = problems.length - visible.length;
  return (
    <span className={`problem-list ${expanded ? "expanded" : ""}`} title={problems.join("\n")}>
      {visible.map((problem) => <button type="button" className={`problem-chip problem-${problemTone(monitor.lastStatus)} ${issueFilters.includes(problem) ? "active" : ""}`} key={problem} onClick={(event) => { event.stopPropagation(); onIssue(problem); }}>{problem}</button>)}
      {remaining > 0 && <button type="button" className="problem-chip problem-more" onClick={(event) => { event.stopPropagation(); onMoreIssues(monitor.id); }}>+{remaining} more</button>}
    </span>
  );
}

const problemSummary = (monitor: Monitor) => problemsOf(monitor).filter((problem) => problem !== resultReason(monitor));

const problemsOf = (monitor: Monitor) => [...new Set([
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

const issueTexts = (monitor: Monitor) => [...new Set([resultReason(monitor), ...problemsOf(monitor)].filter(Boolean))];

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

const heroIcon = (counts: Record<string, number>) =>
  heroTone(counts) === "critical" ? <Siren size={22} /> : heroTone(counts) === "warning" ? <TriangleAlert size={22} /> : <HeartPulse size={22} />;

const heroTitle = (counts: Record<string, number>) =>
  heroTone(counts) === "critical" ? "Attention required" : heroTone(counts) === "warning" ? "Mostly healthy, watch warnings" : "All monitored checks look healthy";

const heroDescription = (counts: Record<string, number>) =>
  heroTone(counts) === "critical"
    ? "Critical or down monitors need action before customers notice service or certificate problems."
    : heroTone(counts) === "warning"
      ? "The platform is operating, but some checks are approaching thresholds or changed state."
      : "Certificate, service, and login checks are currently inside their expected operating range.";

const statusMark = (status: string) => ({
  OK: <Check size={14} strokeWidth={3} />,
  WARNING: <TriangleAlert size={13} />,
  CRITICAL: <X size={14} strokeWidth={3} />,
  DOWN: <Unplug size={13} />,
  PAUSED: <Pause size={13} />,
  UNKNOWN: <CircleHelp size={13} />
}[status] ?? <CircleHelp size={13} />);


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
const summaryFor = (monitors: Monitor[]) =>
  `${monitors.length} ${monitors.length === 1 ? "check" : "checks"}`;
