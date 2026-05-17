import { Router } from "express";
import { z } from "zod";
import { createBackup, backupPath, deleteBackup, listBackups } from "../backup/backupService.js";
import { createPlainApiToken, hashToken, requireAdmin } from "../auth/auth.js";
import { discoverMonitors } from "../checks/discovery.js";
import { apiTokens, appSettings, deliveries, incidents, monitors, results } from "../storage/repositories.js";
import { id } from "../utils/id.js";

export const opsRoutes = Router();

opsRoutes.get("/settings/maintenance", (_req, res) => res.json(appSettings.maintenance()));
opsRoutes.put("/settings/maintenance", (req, res) => saveSetting(req, res, "maintenance", maintenanceSchema));
opsRoutes.get("/settings/tls-policy", (_req, res) => res.json(appSettings.tlsPolicy()));
opsRoutes.put("/settings/tls-policy", (req, res) => saveSetting(req, res, "tlsPolicy", tlsPolicySchema));
opsRoutes.get("/settings/status-pages", (_req, res) => res.json(appSettings.statusPages()));
opsRoutes.put("/settings/status-pages", (req, res) => saveSetting(req, res, "statusPages", statusPagesSchema));
opsRoutes.get("/settings/discovery", (_req, res) => res.json(appSettings.discovery()));
opsRoutes.put("/settings/discovery", (req, res) => saveSetting(req, res, "discovery", discoverySchema));
opsRoutes.get("/settings/backups", (_req, res) => res.json(appSettings.backups()));
opsRoutes.put("/settings/backups", (req, res) => saveSetting(req, res, "backups", backupsSchema));

opsRoutes.post("/discovery/run", async (_req, res) => {
  const settings = appSettings.discovery();
  const suggestions = (await Promise.all(settings.domains.map(discoverMonitors))).flat();
  const next = { ...settings, suggestions, lastRunAt: new Date().toISOString() };
  appSettings.set("discovery", next);
  res.json(next);
});

opsRoutes.get("/backups", (_req, res) => res.json(listBackups()));
opsRoutes.post("/backups/run", (_req, res) => {
  const settings = appSettings.backups();
  const backup = createBackup(settings);
  appSettings.set("backups", { ...settings, lastRunAt: new Date().toISOString() });
  res.status(201).json(backup);
});
opsRoutes.get("/backups/:name", (req, res) => res.download(backupPath(req.params.name)));
opsRoutes.delete("/backups/:name", (req, res) => {
  deleteBackup(req.params.name);
  res.status(204).end();
});

opsRoutes.get("/api-tokens", requireAdmin, (_req, res) => res.json(apiTokens.list().map(publicToken)));
opsRoutes.post("/api-tokens", requireAdmin, (req, res) => {
  const parsed = tokenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid token." });
  const plain = createPlainApiToken();
  const token = apiTokens.create(parsed.data.name, hashToken(plain), parsed.data.scopes, req.user!.id);
  res.status(201).json({ ...publicToken(token), token: plain });
});
opsRoutes.delete("/api-tokens/:id", requireAdmin, (req, res) => {
  apiTokens.delete(req.params.id);
  res.status(204).end();
});

opsRoutes.get("/deliveries", (_req, res) => res.json(deliveries.list()));
opsRoutes.get("/reports/availability", (req, res) => res.json(availabilityReport(Number(req.query.days ?? 30))));

opsRoutes.post("/incidents/:id/ack", (req, res) => {
  const parsed = z.object({ assignee: z.string().max(120).optional().nullable() }).safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "Invalid acknowledgement." });
  const incident = incidents.acknowledge(req.params.id, req.user!.email, parsed.data.assignee);
  if (!incident) return res.status(404).json({ error: "Incident not found." });
  res.json(incident);
});

opsRoutes.post("/incidents/:id/notes", (req, res) => {
  const parsed = z.object({ text: z.string().trim().min(1).max(2000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid note." });
  const incident = incidents.addNote(req.params.id, req.user!.email, parsed.data.text);
  if (!incident) return res.status(404).json({ error: "Incident not found." });
  res.json(incident);
});

const saveSetting = (req: any, res: any, key: string, schema: z.ZodTypeAny) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid settings." });
  appSettings.set(key, parsed.data);
  res.json(parsed.data);
};

const maintenanceSchema = z.object({
  windows: z.array(z.object({
    id: z.string().default(() => id()),
    name: z.string().min(1).max(120),
    tags: z.array(z.string().min(1).max(40)),
    window: z.string().min(1).max(200),
    enabled: z.boolean()
  })).default([])
});

const tlsPolicySchema = z.object({
  profile: z.enum(["modern", "strict", "legacy"]),
  minimumTlsVersion: z.enum(["TLSv1", "TLSv1.1", "TLSv1.2", "TLSv1.3"]),
  weakCipherPenalty: z.number().int().min(0).max(80),
  requireSan: z.boolean()
});

const statusPagesSchema = z.object({
  pages: z.array(z.object({
    id: z.string().default(() => id()),
    slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
    title: z.string().trim().min(1).max(120),
    description: z.string().max(500).default(""),
    logoUrl: z.string().max(1000).default(""),
    tags: z.array(z.string().min(1).max(40)),
    hideHostnames: z.boolean(),
    enabled: z.boolean()
  })).default([])
});

const discoverySchema = z.object({
  enabled: z.boolean(),
  intervalHours: z.number().int().min(1).max(720),
  domains: z.array(z.string().trim().min(1).max(253)),
  suggestions: z.array(z.any()).default([]),
  lastRunAt: z.string().nullable().optional()
});

const backupsSchema = z.object({
  enabled: z.boolean(),
  intervalHours: z.number().int().min(1).max(720),
  keep: z.number().int().min(1).max(100),
  lastRunAt: z.string().nullable().optional()
});

const tokenSchema = z.object({
  name: z.string().trim().min(1).max(120),
  scopes: z.array(z.enum(["read", "write"])).default(["read"])
});

const publicToken = (token: any) => ({ id: token.id, name: token.name, scopes: token.scopes, createdAt: token.createdAt, lastUsedAt: token.lastUsedAt });

const availabilityReport = (days: number) => {
  const cutoff = Date.now() - Math.max(1, Math.min(days, 3650)) * 86_400_000;
  return monitors.list().map((monitor) => {
    const checks = results.list(monitor.id, 2000).filter((result) => new Date(result.checkedAt).getTime() >= cutoff);
    const ok = checks.filter((result) => result.status === "OK").length;
    const monitorIncidents = incidents.listForMonitor(monitor.id, 200).filter((incident) => new Date(incident.startedAt).getTime() >= cutoff);
    const resolved = monitorIncidents.filter((incident) => incident.resolvedAt);
    const mttrMinutes = resolved.length ? Math.round(resolved.reduce((sum, incident) => sum + (new Date(incident.resolvedAt!).getTime() - new Date(incident.startedAt).getTime()) / 60_000, 0) / resolved.length) : null;
    return { monitorId: monitor.id, name: monitor.name, tags: monitor.tags, checks: checks.length, availability: checks.length ? Math.round((ok / checks.length) * 10_000) / 100 : null, incidents: monitorIncidents.length, mttrMinutes };
  });
};
