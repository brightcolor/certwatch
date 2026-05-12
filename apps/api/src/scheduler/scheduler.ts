import { env } from "../config/env.js";
import { runTlsCheck } from "../checks/tlsChecker.js";
import { channels, monitors, results } from "../storage/repositories.js";
import { dispatchAlerts } from "../notifications/service.js";

let running = false;

export const startScheduler = () => {
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const due = monitors.due(env.checkConcurrency);
      await Promise.allSettled(due.map(runMonitor));
    } finally {
      running = false;
    }
  };
  void tick();
  setInterval(tick, 30_000).unref();
};

const runMonitor = async (monitor: ReturnType<typeof monitors.list>[number]) => {
  try {
    const previous = results.list(monitor.id, 1)[0]?.fingerprintSha256;
    const result = await runTlsCheck(monitor, previous);
    results.insert(result);
    monitors.markChecked(monitor, result);
    await dispatchAlerts(monitor, result, channels.list());
  } catch (error) {
    console.error(`Check failed for monitor ${monitor.id}:`, error instanceof Error ? error.message : error);
  }
};
