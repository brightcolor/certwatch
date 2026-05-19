import { Router } from "express";
import { appSettings, channels, monitors, results } from "../storage/repositories.js";
import { defaultsFor, monitorInputSchema } from "./monitorSchemas.js";
import type { ChannelType, Monitor, NotificationChannel } from "../types.js";
import { id } from "../utils/id.js";
import { nowIso } from "../utils/time.js";
import { redactConfigSecrets } from "../utils/secrets.js";

export const exportRoutes = Router();

exportRoutes.get("/monitors.json", (_req, res) => {
  res.attachment("certwatch-monitors.json").json({ monitors: monitors.list().map(publicMonitor) });
});

exportRoutes.post("/monitors.json", (req, res) => {
  const input = Array.isArray(req.body?.monitors) ? req.body.monitors : [];
  const created = [];
  for (const item of input) {
    const parsed = monitorInputSchema.safeParse(defaultsFor(item));
    if (parsed.success) created.push(publicMonitor(monitors.create(parsed.data)));
  }
  res.status(201).json({ imported: created.length, monitors: created });
});

exportRoutes.get("/backup.json", (_req, res) => {
  res.attachment("certwatch-backup.json").json({
    version: 1,
    exportedAt: new Date().toISOString(),
    monitors: monitors.list().map(publicMonitor),
    notificationChannels: channels.list().map((channel) => ({ ...channel, config: redactConfigSecrets(channel.config ?? {}) })),
    notificationRoutes: appSettings.notificationRoutes(),
    settings: {
      alerting: appSettings.alerting(),
      smtp: redactConfigSecrets(appSettings.smtp() as unknown as Record<string, unknown>),
      retention: appSettings.retention(),
      ctWatch: appSettings.ctWatch(),
      maintenance: appSettings.maintenance(),
      tlsPolicy: appSettings.tlsPolicy(),
      sslLabs: appSettings.sslLabs(),
      statusPages: appSettings.statusPages(),
      discovery: { ...appSettings.discovery(), suggestions: [] },
      backups: appSettings.backups()
    }
  });
});

exportRoutes.post("/restore", (req, res) => {
  const input = req.body ?? {};
  const created = [];
  let restoredChannels = 0;
  for (const item of Array.isArray(input.monitors) ? input.monitors : []) {
    const parsed = monitorInputSchema.safeParse(defaultsFor(item));
    if (parsed.success) created.push(publicMonitor(monitors.create(parsed.data)));
  }
  for (const item of Array.isArray(input.notificationChannels) ? input.notificationChannels : []) {
    const channel = restoreChannel(item);
    if (channel) {
      channels.upsert(channel);
      restoredChannels += 1;
    }
  }
  if (input.settings?.alerting) appSettings.set("alerting", input.settings.alerting);
  if (input.settings?.retention) appSettings.set("retention", input.settings.retention);
  if (input.settings?.ctWatch) appSettings.set("ctWatch", input.settings.ctWatch);
  if (input.settings?.maintenance) appSettings.set("maintenance", input.settings.maintenance);
  if (input.settings?.tlsPolicy) appSettings.set("tlsPolicy", input.settings.tlsPolicy);
  if (input.settings?.sslLabs) appSettings.set("sslLabs", input.settings.sslLabs);
  if (input.settings?.statusPages) appSettings.set("statusPages", input.settings.statusPages);
  if (input.settings?.discovery) appSettings.set("discovery", input.settings.discovery);
  if (input.settings?.backups) appSettings.set("backups", input.settings.backups);
  if (Array.isArray(input.notificationRoutes)) appSettings.set("notificationRoutes", input.notificationRoutes);
  res.status(201).json({ imported: created.length, restoredChannels, monitors: created });
});

exportRoutes.get("/certificates.csv", (_req, res) => {
  const latest = results.latestByMonitor();
  const rows = [["name", "host", "port", "status", "days_remaining", "valid_until", "issuer", "fingerprint_sha256", "tls_grade", "ssl_labs_grade"]];
  for (const monitor of monitors.list()) {
    const result = latest[monitor.id];
    rows.push([monitor.name, monitor.host, String(monitor.port), monitor.lastStatus, String(result?.daysRemaining ?? ""), result?.validUntil ?? "", result?.issuer ?? "", result?.fingerprintSha256 ?? "", result?.tlsGrade ?? "", result?.sslLabsGrade ?? ""]);
  }
  res.type("text/csv").attachment("certwatch-certificates.csv").send(toCsv(rows));
});

exportRoutes.get("/history.csv", (_req, res) => {
  const rows = [["monitor_id", "checked_at", "status", "message", "days_remaining", "valid_until", "issuer", "tls_grade", "ssl_labs_grade"]];
  for (const monitor of monitors.list()) {
    for (const result of results.list(monitor.id, 1000)) {
      rows.push([monitor.id, result.checkedAt, result.status, result.message, String(result.daysRemaining ?? ""), result.validUntil ?? "", result.issuer ?? "", result.tlsGrade ?? "", result.sslLabsGrade ?? ""]);
    }
  }
  res.type("text/csv").attachment("certwatch-history.csv").send(toCsv(rows));
});

const toCsv = (rows: string[][]) => rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");

const publicMonitor = (monitor: Monitor) => ({ ...monitor, config: redactConfigSecrets(monitor.config ?? {}) });

const channelTypes: ChannelType[] = ["email", "pushover", "webhook", "discord", "slack", "telegram", "gotify", "ntfy", "teams", "mattermost", "matrix", "pagerduty", "opsgenie"];

const restoreChannel = (item: any): NotificationChannel | null => {
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
