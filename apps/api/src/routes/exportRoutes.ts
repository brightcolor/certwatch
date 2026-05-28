import { Router } from "express";
import { appSettings, channels, monitors, results } from "../storage/repositories.js";
import { defaultsFor, monitorInputSchema } from "./monitorSchemas.js";
import type { ChannelType, Monitor, NotificationChannel } from "../types.js";
import { id } from "../utils/id.js";
import { nowIso } from "../utils/time.js";
import { redactConfigSecrets } from "../utils/secrets.js";

export const exportRoutes = Router();

exportRoutes.get("/monitors.json", (req, res) => {
  res.attachment("certwatch-monitors.json").json({ monitors: monitors.list(req.currentTenant!.id).map(publicMonitor) });
});

exportRoutes.post("/monitors.json", (req, res) => {
  const input = Array.isArray(req.body?.monitors) ? req.body.monitors : [];
  const created = [];
  for (const item of input) {
    const parsed = monitorInputSchema.safeParse(defaultsFor(item));
    if (parsed.success) created.push(publicMonitor(monitors.create({ ...parsed.data, tenantId: req.currentTenant!.id })));
  }
  res.status(201).json({ imported: created.length, monitors: created });
});

exportRoutes.get("/backup.json", (_req, res) => {
  res.attachment("certwatch-backup.json").json({
    version: 1,
    exportedAt: new Date().toISOString(),
    monitors: monitors.list(_req.currentTenant!.id).map(publicMonitor),
    notificationChannels: channels.list(_req.currentTenant!.id).map((channel) => ({ ...channel, config: redactConfigSecrets(channel.config ?? {}) })),
    notificationRoutes: appSettings.notificationRoutes(_req.currentTenant!.id),
    settings: {
      alerting: appSettings.alerting(_req.currentTenant!.id),
      smtp: redactConfigSecrets(appSettings.smtp(_req.currentTenant!.id) as unknown as Record<string, unknown>),
      retention: appSettings.retention(_req.currentTenant!.id),
      ctWatch: appSettings.ctWatch(_req.currentTenant!.id),
      maintenance: appSettings.maintenance(_req.currentTenant!.id),
      tlsPolicy: appSettings.tlsPolicy(_req.currentTenant!.id),
      sslLabs: appSettings.sslLabs(_req.currentTenant!.id),
      statusPages: appSettings.statusPages(_req.currentTenant!.id),
      discovery: { ...appSettings.discovery(_req.currentTenant!.id), suggestions: [] },
      backups: appSettings.backups(_req.currentTenant!.id)
    }
  });
});

exportRoutes.post("/restore", (req, res) => {
  const input = req.body ?? {};
  const created = [];
  let restoredChannels = 0;
  for (const item of Array.isArray(input.monitors) ? input.monitors : []) {
    const parsed = monitorInputSchema.safeParse(defaultsFor(item));
    if (parsed.success) created.push(publicMonitor(monitors.create({ ...parsed.data, tenantId: req.currentTenant!.id })));
  }
  for (const item of Array.isArray(input.notificationChannels) ? input.notificationChannels : []) {
    const channel = restoreChannel(item);
    if (channel) {
      channels.upsert({ ...channel, tenantId: req.currentTenant!.id });
      restoredChannels += 1;
    }
  }
  if (input.settings?.alerting) appSettings.set("alerting", input.settings.alerting, req.currentTenant!.id);
  if (input.settings?.retention) appSettings.set("retention", input.settings.retention, req.currentTenant!.id);
  if (input.settings?.ctWatch) appSettings.set("ctWatch", input.settings.ctWatch, req.currentTenant!.id);
  if (input.settings?.maintenance) appSettings.set("maintenance", input.settings.maintenance, req.currentTenant!.id);
  if (input.settings?.tlsPolicy) appSettings.set("tlsPolicy", input.settings.tlsPolicy, req.currentTenant!.id);
  if (input.settings?.sslLabs) appSettings.set("sslLabs", input.settings.sslLabs, req.currentTenant!.id);
  if (input.settings?.statusPages) appSettings.set("statusPages", input.settings.statusPages, req.currentTenant!.id);
  if (input.settings?.discovery) appSettings.set("discovery", input.settings.discovery, req.currentTenant!.id);
  if (input.settings?.backups) appSettings.set("backups", input.settings.backups, req.currentTenant!.id);
  if (Array.isArray(input.notificationRoutes)) appSettings.set("notificationRoutes", input.notificationRoutes, req.currentTenant!.id);
  res.status(201).json({ imported: created.length, restoredChannels, monitors: created });
});

exportRoutes.get("/certificates.csv", (_req, res) => {
  const latest = results.latestByMonitor();
  const rows = [["name", "host", "port", "status", "days_remaining", "valid_until", "issuer", "fingerprint_sha256", "tls_grade", "ssl_labs_grade", "resolved_addresses"]];
  for (const monitor of monitors.list(_req.currentTenant!.id)) {
    const result = latest[monitor.id];
    rows.push([monitor.name, monitor.host, String(monitor.port), monitor.lastStatus, String(result?.daysRemaining ?? ""), result?.validUntil ?? "", result?.issuer ?? "", result?.fingerprintSha256 ?? "", result?.tlsGrade ?? "", result?.sslLabsGrade ?? "", result?.dns?.addresses.join(" ") ?? ""]);
  }
  res.type("text/csv").attachment("certwatch-certificates.csv").send(toCsv(rows));
});

exportRoutes.get("/history.csv", (_req, res) => {
  const rows = [["monitor_id", "checked_at", "status", "message", "days_remaining", "valid_until", "issuer", "tls_grade", "ssl_labs_grade"]];
  for (const monitor of monitors.list(_req.currentTenant!.id)) {
    for (const result of results.list(monitor.id, 1000)) {
      rows.push([monitor.id, result.checkedAt, result.status, result.message, String(result.daysRemaining ?? ""), result.validUntil ?? "", result.issuer ?? "", result.tlsGrade ?? "", result.sslLabsGrade ?? ""]);
    }
  }
  res.type("text/csv").attachment("certwatch-history.csv").send(toCsv(rows));
});

const toCsv = (rows: string[][]) => rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");

const publicMonitor = (monitor: Monitor) => ({ ...monitor, config: redactConfigSecrets(monitor.config ?? {}) });

const channelTypes: ChannelType[] = ["email", "pushover", "webhook", "discord", "slack", "telegram", "gotify", "ntfy", "teams", "mattermost", "matrix", "pagerduty", "opsgenie"];

const restoreChannel = (item: any): Omit<NotificationChannel, "tenantId"> | null => {
  if (!item?.name || !channelTypes.includes(item.type)) return null;
  const now = nowIso();
  return {
    id: typeof item.id === "string" ? item.id : id(),
    name: String(item.name).slice(0, 100),
    type: item.type,
    enabled: Boolean(item.enabled),
    config: item.config && typeof item.config === "object" ? item.config : {},
    createdAt: typeof item.createdAt === "string" ? item.createdAt : now,
    updatedAt: now
  };
};
