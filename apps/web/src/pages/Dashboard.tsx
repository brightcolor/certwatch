import { Search, ShieldCheck, Siren, TimerReset, TriangleAlert } from "lucide-react";
import type { Monitor } from "../api/client";
import { StatusPill } from "../components/StatusPill";

export function Dashboard({ monitors, stats, query, setQuery, onSelect, onCheck }: any) {
  const filtered = monitors.filter((monitor: Monitor) =>
    [monitor.name, monitor.host, monitor.tags.join(" ")].join(" ").toLowerCase().includes(query.toLowerCase())
  );

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
        {filtered.map((monitor: Monitor) => (
          <div className="row" key={monitor.id} onClick={() => onSelect(monitor.id)}>
            <span><StatusPill status={monitor.lastStatus} /></span>
            <span><strong>{monitor.name}</strong><small>{monitor.tags.join(", ") || "unlabeled"}</small></span>
            <span>{monitor.host}:{monitor.port}<small>{monitor.type}</small></span>
            <span>{monitor.latestResult?.daysRemaining ?? "-"} days<small>{[shortDate(monitor.latestResult?.validUntil), monitor.latestResult?.tlsGrade ? `grade ${monitor.latestResult.tlsGrade}` : ""].filter(Boolean).join(" - ")}</small></span>
            <span>{monitor.latestResult?.message ?? "No result yet"}<small>{monitor.latestResult?.tlsVersion ?? ""}</small></span>
            <span><button onClick={(e) => { e.stopPropagation(); onCheck(monitor.id); }}>Check now</button></span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: any) {
  return <div className="metric">{icon}<div><span>{label}</span><strong>{value}</strong></div></div>;
}

const shortDate = (value?: string | null) => value ? new Date(value).toLocaleDateString() : "";
