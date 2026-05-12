import { Router } from "express";
import { monitors, results } from "../storage/repositories.js";
import { defaultsFor, monitorInputSchema } from "./monitorSchemas.js";

export const exportRoutes = Router();

exportRoutes.get("/monitors.json", (_req, res) => {
  res.attachment("certwatch-monitors.json").json({ monitors: monitors.list() });
});

exportRoutes.post("/monitors.json", (req, res) => {
  const input = Array.isArray(req.body?.monitors) ? req.body.monitors : [];
  const created = [];
  for (const item of input) {
    const parsed = monitorInputSchema.safeParse(defaultsFor(item));
    if (parsed.success) created.push(monitors.create(parsed.data));
  }
  res.status(201).json({ imported: created.length, monitors: created });
});

exportRoutes.get("/certificates.csv", (_req, res) => {
  const latest = results.latestByMonitor();
  const rows = [["name", "host", "port", "status", "days_remaining", "valid_until", "issuer", "fingerprint_sha256"]];
  for (const monitor of monitors.list()) {
    const result = latest[monitor.id];
    rows.push([monitor.name, monitor.host, String(monitor.port), monitor.lastStatus, String(result?.daysRemaining ?? ""), result?.validUntil ?? "", result?.issuer ?? "", result?.fingerprintSha256 ?? ""]);
  }
  res.type("text/csv").attachment("certwatch-certificates.csv").send(toCsv(rows));
});

exportRoutes.get("/history.csv", (_req, res) => {
  const rows = [["monitor_id", "checked_at", "status", "message", "days_remaining", "valid_until", "issuer"]];
  for (const monitor of monitors.list()) {
    for (const result of results.list(monitor.id, 1000)) {
      rows.push([monitor.id, result.checkedAt, result.status, result.message, String(result.daysRemaining ?? ""), result.validUntil ?? "", result.issuer ?? ""]);
    }
  }
  res.type("text/csv").attachment("certwatch-history.csv").send(toCsv(rows));
});

const toCsv = (rows: string[][]) => rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
