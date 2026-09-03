import { humanize } from "../utils/labels";

const labels: Record<string, string> = {
  OK: "Ok",
  WARNING: "Warning",
  CRITICAL: "Critical",
  DOWN: "Down",
  PAUSED: "Paused",
  UNKNOWN: "Unknown"
};

export function StatusPill({ status }: { status: string }) {
  const key = status.toLowerCase();
  return <span className={`status status-${key}`}>{labels[status] ?? humanize(status)}</span>;
}
