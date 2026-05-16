import type { Monitor } from "../api/client";
import { StatusPill } from "../components/StatusPill";

export function Applications({ monitors, onSelect }: { monitors: Monitor[]; onSelect: (id: string) => void }) {
  const groups = Array.from(new Set(monitors.flatMap((monitor) => monitor.tags))).sort().map((tag) => ({
    tag,
    monitors: monitors.filter((monitor) => monitor.tags.includes(tag))
  }));
  const origin = window.location.origin;

  return (
    <section className="content">
      <div className="panel">
        <h2>Applications</h2>
        <p className="muted">Labels group multiple checks into one service/application rollup.</p>
      </div>
      <div className="grid two">
        {groups.map((group) => {
          const status = rollup(group.monitors);
          const key = encodeURIComponent(group.tag);
          const statusUrl = `${origin}/public/status/${key}.html`;
          const badgeUrl = `${origin}/public/badge/tags/${key}.svg`;
          return (
            <div className="panel" key={group.tag}>
              <div className="detail-head">
                <div><h3>{group.tag}</h3><small>{group.monitors.length} checks</small></div>
                <StatusPill status={status} />
              </div>
              <div className="history">
                {group.monitors.map((monitor) => <div key={monitor.id} onClick={() => onSelect(monitor.id)}><StatusPill status={monitor.lastStatus} /><span>{monitor.name}</span><span>{monitor.host}:{monitor.port}</span></div>)}
              </div>
              <EmbedRow label="Status" value={statusUrl} />
              <EmbedRow label="Badge" value={badgeUrl} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EmbedRow({ label, value }: { label: string; value: string }) {
  return <div className="info"><span>{label}</span><code>{value}</code><button type="button" onClick={() => navigator.clipboard?.writeText(value)}>Copy</button></div>;
}

const rollup = (monitors: Monitor[]) =>
  monitors.some((monitor) => monitor.lastStatus === "DOWN" || monitor.lastStatus === "CRITICAL") ? "CRITICAL" :
    monitors.some((monitor) => monitor.lastStatus === "WARNING") ? "WARNING" :
      monitors.some((monitor) => monitor.lastStatus === "PAUSED") ? "PAUSED" :
        monitors.some((monitor) => monitor.lastStatus === "UNKNOWN") ? "UNKNOWN" : "OK";
