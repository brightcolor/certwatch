import type { CheckResult, Monitor } from "../types.js";
import { appSettings, results } from "../storage/repositories.js";
import { applyResultWatches } from "./changeWatch.js";
import { enrichWithDnsResolution } from "./dnsResolution.js";
import { enrichWithSslLabs } from "./sslLabs.js";
import { markFlapping } from "./flapping.js";
import { isServiceMonitor, runServiceCheck } from "./serviceChecker.js";
import { runTlsCheck } from "./tlsChecker.js";

export const runMonitorCheck = async (monitor: Monitor, previous?: CheckResult) => {
  const checked = isServiceMonitor(monitor.type)
    ? await runServiceCheck(monitor, previous?.fingerprintSha256, appSettings.tlsPolicy())
    : await runTlsCheck(monitor, previous?.fingerprintSha256, appSettings.tlsPolicy());
  const sslLabs = await enrichWithSslLabs(monitor, checked, previous, appSettings.sslLabs(), results.latestSslLabsForHost(monitor.host));
  const dns = await enrichWithDnsResolution(monitor, sslLabs, previous);
  const watched = applyResultWatches(dns, previous, appSettings.alerting(), monitor);
  return markFlapping(watched, results.listRecent(monitor.id, 10), appSettings.alerting().flappingThreshold);
};
