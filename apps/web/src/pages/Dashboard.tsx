import { Search, ShieldCheck, Siren, TimerReset, TriangleAlert } from "lucide-react";
import type { Monitor } from "../api/client";
import { StatusPill } from "../components/StatusPill";

export function Dashboard({ monitors, stats, query, setQuery, onSelect, onCheck }: any) {
  const filtered = monitors.filter((monitor: Monitor) =>
    [monitor.name, monitor.host, monitor.tags.join(" ")].join(" ").toLowerCase().includes(query.toLowerCase())
  );
  const tags = Array.from(new Set<string>(monitors.flatMap((monitor: Monitor) => monitor.tags))).sort();
  const origin = window.location.origin;
  const combinations = tagCombinations(tags);

  return (
    <section className="content">
      <div className="metrics">
        <Metric icon={<ShieldCheck />} label="Valid" value={stats.ok ?? 0} />
        <Metric icon={<TriangleAlert />} label="Expiring soon" value={stats.warning ?? 0} />
        <Metric icon={<Siren />} label="Critical" value={(stats.critical ?? 0) + (stats.down ?? 0)} />
        <Metric icon={<TimerReset />} label="Paused" value={stats.paused ?? 0} />
      </div>
      <div className="toolbar"><Search size={18} /><input placeholder="Search monitors, hosts, tags" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      {tags.length > 0 && (
        <div className="panel">
          <h3>Public status pages</h3>
          <div className="history">
            {combinations.map((group) => {
              const key = group.map(encodeURIComponent).join("+");
              const label = group.join(" + ");
              const html = `${origin}/public/status/${key}.html`;
              const json = `${origin}/public/status/${key}`;
              const badge = `${origin}/public/badge/tags/${key}.svg`;
              const iframe = `<iframe src="${html}" title="CertWatch ${label}" loading="lazy"></iframe>`;
              const markdown = `[![${label}](${badge})](${html})`;
              return <div key={key}><strong>{label}</strong><code>{html}</code><button onClick={() => navigator.clipboard?.writeText(html)}>Copy URL</button><button onClick={() => navigator.clipboard?.writeText(iframe)}>Copy iframe</button><button onClick={() => navigator.clipboard?.writeText(markdown)}>Copy badge</button><a href={html} target="_blank" rel="noreferrer">Open</a><small>JSON: {json}</small></div>;
            })}
          </div>
        </div>
      )}
      <div className="table">
        <div className="row head"><span>Status</span><span>Name</span><span>Target</span><span>Expires</span><span>TLS</span><span></span></div>
        {filtered.map((monitor: Monitor) => (
          <div className="row" key={monitor.id} onClick={() => onSelect(monitor.id)}>
            <span><StatusPill status={monitor.lastStatus} /></span>
            <span><strong>{monitor.name}</strong><small>{monitor.tags.join(", ") || "untagged"}</small></span>
            <span>{monitor.host}:{monitor.port}<small>{monitor.type}</small></span>
            <span>{monitor.latestResult?.daysRemaining ?? "-"} days<small>{shortDate(monitor.latestResult?.validUntil)}</small></span>
            <span>{monitor.latestResult?.tlsVersion ?? "-"}<small>{monitor.latestResult?.cipherSuite ?? ""}</small></span>
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
const tagCombinations = (tags: string[]) => [
  ...tags.map((tag) => [tag]),
  ...tags.flatMap((left, index) => tags.slice(index + 1).map((right) => [left, right]))
];
