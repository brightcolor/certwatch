import { env } from "../config/env.js";
import { runTlsCheck } from "../checks/tlsChecker.js";
import { alerts, appSettings, channels, monitors, results } from "../storage/repositories.js";
import { dispatchAlerts } from "../notifications/service.js";
import { applyCertificateChangeWatch } from "../checks/changeWatch.js";
import { isServiceMonitor, runServiceCheck } from "../checks/serviceChecker.js";

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
    } finally {
      running = false;
    }
  };
  void tick();
  setInterval(tick, 30_000).unref();
};

const runRetentionIfDue = () => {
  if (Date.now() - lastRetentionRun < 3_600_000) return;
  lastRetentionRun = Date.now();
  const retention = appSettings.retention();
  results.prune(retention.checkResultsDays);
  alerts.prune(retention.alertHistoryDays);
};

const runMonitor = async (monitor: ReturnType<typeof monitors.list>[number]) => {
  try {
    const previous = results.list(monitor.id, 1)[0];
    const checked = isServiceMonitor(monitor.type) ? await runServiceCheck(monitor) : await runTlsCheck(monitor, previous?.fingerprintSha256);
    const result = isServiceMonitor(monitor.type) ? checked : applyCertificateChangeWatch(checked, previous, appSettings.alerting());
    results.insert(result);
    monitors.markChecked(monitor, result);
    await dispatchAlerts(monitor, result, channels.list());
  } catch (error) {
    console.error(`Check failed for monitor ${monitor.id}:`, error instanceof Error ? error.message : error);
  }
};
