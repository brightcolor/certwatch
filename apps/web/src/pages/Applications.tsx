import type { Monitor } from "../api/client";
import { StatusPill } from "../components/StatusPill";

export function Applications({ monitors, onSelect }: { monitors: Monitor[]; onSelect: (id: string) => void }) {
  const groups = Array.from(new Set(monitors.flatMap((monitor) => monitor.tags))).sort().map((tag) => ({
    tag,
    monitors: monitors.filter((monitor) => monitor.tags.includes(tag))
  }));
  const origin = window.location.origin;
  const combinations = tagCombinations(groups.map((group) => group.tag));

  return (
    <section className="content">
      <div className="section-head">
        <div>
          <h2>Applications</h2>
          <p className="muted">Labels group related checks into application rollups, status pages, and badges.</p>
        </div>
      </div>
      <div className="grid two">
        {!groups.length && <div className="panel empty-state"><h3>No applications yet</h3><p className="muted">Add labels to monitors to create application rollups automatically.</p></div>}
        {groups.map((group) => {
          const status = rollup(group.monitors);
          const key = encodeURIComponent(group.tag);
          const statusUrl = `${origin}/public/status/${key}.html`;
          const badgeUrl = `${origin}/public/badge/tags/${key}.svg`;
          const aliasBadgeUrl = `${badgeUrl}?label=${encodeURIComponent(group.tag)}`;
          return (
            <div className="panel" key={group.tag}>
              <div className="detail-head">
                <div><h3>{group.tag}</h3><small>{group.monitors.length} checks</small></div>
                <StatusPill status={status} />
              </div>
              <div className="stack-list">
                {group.monitors.map((monitor) => <div key={monitor.id} onClick={() => onSelect(monitor.id)}><StatusPill status={monitor.lastStatus} /><span>{monitor.name}</span><span>{monitor.host}:{monitor.port}</span></div>)}
              </div>
              <EmbedRow label="Status" value={statusUrl} />
              <EmbedRow label="Badge" value={badgeUrl} />
              <EmbedRow label="Alias badge" value={aliasBadgeUrl} />
            </div>
          );
        })}
      </div>
      {combinations.length > 0 && <div className="panel">
        <h3>Combined status pages</h3>
        <p className="muted">Use combined labels when a public status page should include only checks that match all selected labels.</p>
        <div className="embed-grid">
          {combinations.map((group) => {
            const key = group.map(encodeURIComponent).join("+");
            const label = group.join(" + ");
            const html = `${origin}/public/status/${key}.html`;
            const badge = `${origin}/public/badge/tags/${key}.svg`;
            const aliasBadge = `${badge}?label=${encodeURIComponent(label)}`;
            const iframe = `<iframe src="${html}" title="crt.watch ${label}" loading="lazy"></iframe>`;
            const markdown = `[![${label}](${aliasBadge})](${html})`;
            return <div className="embed-card" key={key}><strong>{label}</strong><code>{html}</code><div className="actions"><button className="btn btn-outline-secondary btn-sm" onClick={() => navigator.clipboard?.writeText(html)}>URL</button><button className="btn btn-outline-secondary btn-sm" onClick={() => navigator.clipboard?.writeText(iframe)}>iframe</button><button className="btn btn-outline-secondary btn-sm" onClick={() => navigator.clipboard?.writeText(markdown)}>Badge</button></div></div>;
          })}
        </div>
      </div>}
    </section>
  );
}

function EmbedRow({ label, value }: { label: string; value: string }) {
  return <div className="info"><span>{label}</span><code>{value}</code><button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => navigator.clipboard?.writeText(value)}>Copy</button></div>;
}

const rollup = (monitors: Monitor[]) =>
  monitors.some((monitor) => monitor.lastStatus === "DOWN" || monitor.lastStatus === "CRITICAL") ? "CRITICAL" :
    monitors.some((monitor) => monitor.lastStatus === "WARNING") ? "WARNING" :
      monitors.some((monitor) => monitor.lastStatus === "PAUSED") ? "PAUSED" :
        monitors.some((monitor) => monitor.lastStatus === "UNKNOWN") ? "UNKNOWN" : "OK";

const tagCombinations = (tags: string[]) => [
  ...tags.map((tag) => [tag]),
  ...tags.flatMap((left, index) => tags.slice(index + 1).map((right) => [left, right]))
];
