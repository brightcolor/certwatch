import { Router } from "express";
import { z } from "zod";
import { id } from "../utils/id.js";
import { nowIso } from "../utils/time.js";
import { alerts, channels, monitors, results } from "../storage/repositories.js";
import { testChannel } from "../notifications/service.js";

export const systemRoutes = Router();

systemRoutes.get("/status", (_req, res) => {
  const all = monitors.list();
  const counts = all.reduce<Record<string, number>>((acc, monitor) => {
    acc[monitor.lastStatus] = (acc[monitor.lastStatus] ?? 0) + 1;
    return acc;
  }, {});
  res.json({
    total: all.length,
    ok: counts.OK ?? 0,
    warning: counts.WARNING ?? 0,
    critical: counts.CRITICAL ?? 0,
    down: counts.DOWN ?? 0,
    paused: counts.PAUSED ?? 0,
    unknown: counts.UNKNOWN ?? 0,
    latestResults: Object.values(results.latestByMonitor()).slice(0, 10)
  });
});

systemRoutes.get("/alerts", (_req, res) => res.json(alerts.list()));
systemRoutes.get("/notification-channels", (_req, res) => res.json(channels.list().map(redactChannel)));

systemRoutes.post("/notification-channels", (req, res) => {
  const parsed = channelSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid channel." });
  const now = nowIso();
  const channel = { ...parsed.data, id: parsed.data.id ?? id(), createdAt: now, updatedAt: now };
  channels.upsert(channel);
  res.status(201).json(redactChannel(channel));
});

systemRoutes.post("/notification-channels/test", async (req, res) => {
  const channel = req.body.id ? channels.get(String(req.body.id)) : req.body;
  if (!channel) return res.status(404).json({ error: "Notification channel not found." });
  await testChannel(channel);
  res.json({ ok: true });
});

const channelSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  type: z.enum(["email", "pushover", "webhook", "discord", "slack", "telegram", "gotify", "ntfy"]),
  enabled: z.boolean().default(true),
  config: z.record(z.unknown()).default({})
});

const redactChannel = (channel: any) => ({
  ...channel,
  config: Object.fromEntries(Object.entries(channel.config ?? {}).map(([key, value]) =>
    /pass|token|secret|key/i.test(key) ? [key, value ? "********" : ""] : [key, value]
  ))
});
