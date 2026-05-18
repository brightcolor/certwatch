import { env } from "../config/env.js";
import { runTlsCheck } from "../checks/tlsChecker.js";
import { alerts, appSettings, channels, deliveries, incidents, monitors, results, subscriptions } from "../storage/repositories.js";
import { dispatchAlerts, dispatchStatusSubscriptions } from "../notifications/service.js";
import { applyCertificateChangeWatch } from "../checks/changeWatch.js";
import { isServiceMonitor, runServiceCheck } from "../checks/serviceChecker.js";
import { markFlapping } from "../checks/flapping.js";
import { discoverMonitors } from "../checks/discovery.js";
import { createBackup } from "../backup/backupService.js";

let running = false;
let lastRetentionRun = 0;

export const startScheduler = () => {
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const due = monitors.due(env.checkConcurrency);
      await Promise.allSettled(due.map(runMonitor));
      runRetentionIfDue();
      await runDiscoveryIfDue();
      runBackupIfDue();
    } finally {
      running = false;
    }
  };
  void tick();
  setInterval(tick, 30_000).unref();
};

const runDiscoveryIfDue = async () => {
  const settings = appSettings.discovery();
  if (!settings.enabled || !settings.domains.length || !elapsed(settings.lastRunAt, settings.intervalHours)) return;
  const suggestions = (await Promise.all(settings.domains.map(discoverMonitors))).flat();
  appSettings.set("discovery", { ...settings, suggestions, lastRunAt: new Date().toISOString() });
};

const runBackupIfDue = () => {
  const settings = appSettings.backups();
  if (!settings.enabled || !elapsed(settings.lastRunAt, settings.intervalHours)) return;
  createBackup(settings);
  appSettings.set("backups", { ...settings, lastRunAt: new Date().toISOString() });
};

const elapsed = (lastRunAt: string | null | undefined, intervalHours: number) =>
  !lastRunAt || Date.now() - new Date(lastRunAt).getTime() >= intervalHours * 3_600_000;

const runRetentionIfDue = () => {
  if (Date.now() - lastRetentionRun < 3_600_000) return;
  lastRetentionRun = Date.now();
  const retention = appSettings.retention();
  results.prune(retention.checkResultsDays);
  alerts.prune(retention.alertHistoryDays);
  deliveries.prune(retention.alertHistoryDays);
};

const runMonitor = async (monitor: ReturnType<typeof monitors.list>[number]) => {
  try {
    const previous = results.list(monitor.id, 1)[0];
    const checked = isServiceMonitor(monitor.type) ? await runServiceCheck(monitor, previous?.fingerprintSha256, appSettings.tlsPolicy()) : await runTlsCheck(monitor, previous?.fingerprintSha256, appSettings.tlsPolicy());
    const classified = checked.fingerprintSha256 ? applyCertificateChangeWatch(checked, previous, appSettings.alerting()) : checked;
    const result = markFlapping(classified, results.listRecent(monitor.id, 10), appSettings.alerting().flappingThreshold);
    const openIncident = incidents.openForMonitor(monitor.id);
    results.insert(result);
    const statusEvent = result.status === "OK" ? (openIncident ? "resolved" : null) : (!openIncident ? "opened" : null);
    incidents.sync(monitor, result);
    monitors.markChecked(monitor, result);
    await dispatchAlerts(monitor, result, channels.list());
    if (statusEvent) await dispatchStatusSubscriptions(monitor, result, statusEvent, subscriptions.list());
  } catch (error) {
    console.error(`Check failed for monitor ${monitor.id}:`, error instanceof Error ? error.message : error);
  }
};
