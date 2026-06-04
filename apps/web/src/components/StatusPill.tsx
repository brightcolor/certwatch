const labels: Record<string, string> = {
  OK: "Ok",
  WARNING: "Warning",
  CRITICAL: "Critical",
  DOWN: "Down",
  PAUSED: "Paused",
  UNKNOWN: "Unknown"
};

export function StatusPill({ status }: { status: string }) {
  return <span className={`status soft-pill ${toneFor(status)} status-${status.toLowerCase()}`}>{labels[status] ?? status}</span>;
}

const toneFor = (status: string) =>
  status === "OK" ? "success" :
    status === "WARNING" ? "warning" :
      status === "CRITICAL" || status === "DOWN" ? "danger" : "info";
