import { Router } from "express";
import { appSettings, channels, monitors, results } from "../storage/repositories.js";
import { monitorInputSchema } from "./monitorSchemas.js";
import { runTlsCheck } from "../checks/tlsChecker.js";
import { dispatchAlerts } from "../notifications/service.js";
import { applyCertificateChangeWatch } from "../checks/changeWatch.js";

export const monitorRoutes = Router();

monitorRoutes.get("/", (_req, res) => {
  const latest = results.latestByMonitor();
  res.json(monitors.list().map((monitor) => ({ ...monitor, latestResult: latest[monitor.id] ?? null })));
});

monitorRoutes.post("/", async (req, res) => {
  const parsed = monitorInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid monitor." });
  const monitor = monitors.create(parsed.data);
  res.status(201).json(monitor);
});

monitorRoutes.post("/bulk", (req, res) => {
  const lines = String(req.body?.text ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const created = [];
  const errors = [];
  for (const line of lines) {
    const parsedLine = parseBulkLine(line);
    const parsed = monitorInputSchema.safeParse(parsedLine);
    if (parsed.success) created.push(monitors.create(parsed.data));
    else errors.push({ line, error: parsed.error.issues[0]?.message ?? "Invalid monitor." });
  }
  res.status(errors.length ? 207 : 201).json({ imported: created.length, errors, monitors: created });
});

monitorRoutes.get("/:id", (req, res) => {
  const monitor = monitors.get(req.params.id);
  if (!monitor) return res.status(404).json({ error: "Monitor not found." });
  res.json({ ...monitor, latestResult: results.list(monitor.id, 1)[0] ?? null });
});

const parseBulkLine = (line: string) => {
  const [target, ...options] = line.split(/\s+/);
  const optionMap = Object.fromEntries(options.map((option) => {
    const [key, value = ""] = option.split("=");
    return [key.toLowerCase(), value.toLowerCase()];
  }));
  const starttls = optionMap.starttls;
  const type = optionMap.type || (starttls ? `${starttls}_starttls` : "https");
  const portByType: Record<string, number> = { https: 443, tls: 443, smtps: 465, imaps: 993, pop3s: 995, ldaps: 636, ftps: 990, xmpps: 5223, smtp_starttls: 587, imap_starttls: 143, pop3_starttls: 110 };
  const [host, rawPort] = target.replace(/^https?:\/\//, "").split(/[/:]/);
  const port = Number(optionMap.port || rawPort || portByType[type] || 443);
  return {
    name: optionMap.name || host,
    host,
    port,
    type,
    enabled: true,
    intervalSeconds: 3600,
    timeoutSeconds: 10,
    warningDays: 30,
    criticalDays: 7,
    sniEnabled: true,
    sniHost: null,
    validateCertificate: true,
    allowSelfSigned: false,
    tags: optionMap.tags ? optionMap.tags.split(",").filter(Boolean) : [],
    notes: null,
    owner: null,
    notificationChannelIds: [],
    notificationRecipients: {},
    maintenanceWindows: null
  };
};

monitorRoutes.put("/:id", (req, res) => {
  const monitor = monitors.get(req.params.id);
  if (!monitor) return res.status(404).json({ error: "Monitor not found." });
  const parsed = monitorInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid monitor." });
  res.json(monitors.update({ ...monitor, ...parsed.data }));
});

monitorRoutes.delete("/:id", (req, res) => {
  monitors.delete(req.params.id);
  res.status(204).end();
});

monitorRoutes.post("/:id/check", async (req, res) => {
  const monitor = monitors.get(req.params.id);
  if (!monitor) return res.status(404).json({ error: "Monitor not found." });
  if (!monitor.enabled) return res.status(409).json({ error: "Monitor is paused." });
  const previous = results.list(monitor.id, 1)[0];
  const checked = await runTlsCheck(monitor, previous?.fingerprintSha256);
  const result = applyCertificateChangeWatch(checked, previous, appSettings.alerting());
  results.insert(result);
  monitors.markChecked(monitor, result);
  await dispatchAlerts(monitor, result, channels.list());
  res.json(result);
});

monitorRoutes.get("/:id/results", (req, res) => {
  res.json(results.list(req.params.id, Number(req.query.limit ?? 100)));
});
