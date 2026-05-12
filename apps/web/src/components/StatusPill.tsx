const labels: Record<string, string> = {
  OK: "Ok",
  WARNING: "Warning",
  CRITICAL: "Critical",
  DOWN: "Down",
  PAUSED: "Paused",
  UNKNOWN: "Unknown"
};

export function StatusPill({ status }: { status: string }) {
  return <span className={`status status-${status.toLowerCase()}`}>{labels[status] ?? status}</span>;
}
