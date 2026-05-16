import type { Request, Response } from "express";
import { monitors, results } from "../storage/repositories.js";

const statusValue: Record<string, number> = { OK: 1, WARNING: 0.5, CRITICAL: 0, DOWN: 0, PAUSED: -1, UNKNOWN: -1 };

export const metricsHandler = (_req: Request, res: Response) => {
  const latest = results.latestByMonitor();
  const lines = [
    "# HELP certwatch_monitor_status Monitor status as numeric value.",
    "# TYPE certwatch_monitor_status gauge",
    "# HELP certwatch_cert_days_remaining Certificate days remaining.",
    "# TYPE certwatch_cert_days_remaining gauge",
    "# HELP certwatch_last_check_timestamp Last check timestamp as Unix seconds.",
    "# TYPE certwatch_last_check_timestamp gauge",
    "# HELP certwatch_check_duration_seconds Last check duration in seconds.",
    "# TYPE certwatch_check_duration_seconds gauge"
  ];

  for (const monitor of monitors.list()) {
    const labels = prometheusLabels({ monitor_id: monitor.id, monitor_name: monitor.name, host: monitor.host, type: monitor.type, tags: monitor.tags.join(",") });
    const result = latest[monitor.id];
    lines.push(`certwatch_monitor_status{${labels}} ${statusValue[monitor.lastStatus] ?? -1}`);
    if (result?.daysRemaining !== null && result?.daysRemaining !== undefined) lines.push(`certwatch_cert_days_remaining{${labels}} ${result.daysRemaining}`);
    if (result?.checkedAt) lines.push(`certwatch_last_check_timestamp{${labels}} ${Math.floor(new Date(result.checkedAt).getTime() / 1000)}`);
    if (result?.durationMs !== undefined) lines.push(`certwatch_check_duration_seconds{${labels}} ${result.durationMs / 1000}`);
  }

  res.type("text/plain; version=0.0.4").send(`${lines.join("\n")}\n`);
};

const prometheusLabels = (labels: Record<string, string>) =>
  Object.entries(labels).map(([key, value]) => `${key}="${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`).join(",");
