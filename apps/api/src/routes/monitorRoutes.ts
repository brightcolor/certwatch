import { Router } from "express";
import { channels, monitors, results } from "../storage/repositories.js";
import { monitorInputSchema } from "./monitorSchemas.js";
import { runTlsCheck } from "../checks/tlsChecker.js";
import { dispatchAlerts } from "../notifications/service.js";

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

monitorRoutes.get("/:id", (req, res) => {
  const monitor = monitors.get(req.params.id);
  if (!monitor) return res.status(404).json({ error: "Monitor not found." });
  res.json({ ...monitor, latestResult: results.list(monitor.id, 1)[0] ?? null });
});

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
  const previous = results.list(monitor.id, 1)[0]?.fingerprintSha256;
  const result = await runTlsCheck(monitor, previous);
  results.insert(result);
  monitors.markChecked(monitor, result);
  await dispatchAlerts(monitor, result, channels.list());
  res.json(result);
});

monitorRoutes.get("/:id/results", (req, res) => {
  res.json(results.list(req.params.id, Number(req.query.limit ?? 100)));
});
