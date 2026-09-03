import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { api } from "../api/client";

export function Reports({ liveRefreshKey = 0 }: { liveRefreshKey?: number }) {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { void api.request<any[]>(`/reports/availability?days=${days}`).then(setRows); }, [days, liveRefreshKey]);

  return (
    <section className="content">
      <div className="panel toolbar-panel">
        <div>
          <h3>Availability report</h3>
          <p className="muted">SLO-style availability, incident count, and MTTR by monitor.</p>
        </div>
        <label>Period<select value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label>
      </div>
      <div className="table" style={{ "--cols": "minmax(12rem, 2.4fr) minmax(6rem, 1.2fr) 5rem 7rem 6rem 6rem" } as CSSProperties}>
        <div className="row head">
          <span>Monitor</span>
          <span>Labels</span>
          <span className="num">Checks</span>
          <span className="num">Availability</span>
          <span className="num">Incidents</span>
          <span className="num">MTTR</span>
        </div>
        {!rows.length && <div className="empty-row"><strong>No checks in this period</strong><span className="muted">Availability is calculated from recorded check results. Pick a longer period or wait for the next scheduled run.</span></div>}
        {rows.map((row) => (
          <div className="row" key={row.monitorId}>
            <span><strong>{row.name}</strong></span>
            <span className="muted">{row.tags.join(", ") || "unlabeled"}</span>
            <span className="num">{row.checks}</span>
            <span className="num">{row.availability === null ? "-" : `${row.availability}%`}</span>
            <span className="num">{row.incidents}</span>
            <span className="num">{row.mttrMinutes === null ? "-" : `${row.mttrMinutes} min`}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
