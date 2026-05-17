import { useEffect, useState } from "react";
import { api } from "../api/client";

export function Reports() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { void api.request<any[]>(`/reports/availability?days=${days}`).then(setRows); }, [days]);

  return (
    <section className="content">
      <div className="panel toolbar-panel">
        <div>
          <h3>Availability report</h3>
          <p className="muted">SLO-style availability, incident count, and MTTR by monitor.</p>
        </div>
        <label>Period<select value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label>
      </div>
      <div className="table">
        <div className="row head"><span>Monitor</span><span>Labels</span><span>Checks</span><span>Availability</span><span>Incidents</span><span>MTTR</span></div>
        {rows.map((row) => <div className="row" key={row.monitorId}><span><strong>{row.name}</strong></span><span>{row.tags.join(", ") || "unlabeled"}</span><span>{row.checks}</span><span>{row.availability === null ? "-" : `${row.availability}%`}</span><span>{row.incidents}</span><span>{row.mttrMinutes === null ? "-" : `${row.mttrMinutes} min`}</span></div>)}
      </div>
    </section>
  );
}
