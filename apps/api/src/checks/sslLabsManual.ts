import net from "node:net";
import { runSslLabsAssessment, sslLabsSupported, type SslLabsAssessment } from "./sslLabs.js";
import type { CheckResult, Monitor, SslLabsSettings } from "../types.js";
import { id } from "../utils/id.js";
import { nowIso } from "../utils/time.js";

export const normalizeSslLabsHost = (target: string) => {
  try {
    const parsed = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(target.trim()) ? target.trim() : `https://${target.trim()}`);
    const host = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (!host || (net.isIP(host) === 0 && !hostnamePattern.test(host))) throw new Error();
    if (net.isIP(host) === 0 && (!host.includes(".") || host === "localhost")) throw new Error();
    return host;
  } catch {
    throw new Error("Enter a valid public hostname for SSL Labs.");
  }
};

export const runManualSslLabsAssessment = async (host: string, monitor: Monitor | undefined, settings: SslLabsSettings, startNewScan = true) => {
  if (!settings.registeredEmail) throw new Error("Configure a registered SSL Labs email before triggering assessments.");
  const candidate = monitor ? { ...monitor, config: { sslLabsEnabled: true } } : { host, port: 443, type: "https" as const, config: { sslLabsEnabled: true } };
  if (!sslLabsSupported(candidate)) throw new Error("SSL Labs is not supported for this target. Use a public HTTPS host on port 443.");
  return runSslLabsAssessment(host, { ...settings, startNewScans: startNewScan });
};

export const buildManualSslLabsResult = (monitor: Monitor, previous: CheckResult | undefined, assessment: SslLabsAssessment): CheckResult => ({
  id: id(),
  monitorId: monitor.id,
  status: previous?.status ?? monitor.lastStatus ?? "UNKNOWN",
  severity: previous?.severity ?? "info",
  message: `Manual SSL Labs assessment completed: ${assessment.sslLabsGrade ?? assessment.sslLabsStatus ?? "no grade returned"}.`,
  checkedAt: nowIso(),
  durationMs: previous?.durationMs ?? 0,
  daysRemaining: previous?.daysRemaining ?? null,
  validFrom: previous?.validFrom ?? null,
  validUntil: previous?.validUntil ?? null,
  commonName: previous?.commonName ?? null,
  subjectAltNames: previous?.subjectAltNames ?? [],
  issuer: previous?.issuer ?? null,
  serialNumber: previous?.serialNumber ?? null,
  fingerprintSha256: previous?.fingerprintSha256 ?? null,
  tlsVersion: previous?.tlsVersion ?? null,
  cipherSuite: previous?.cipherSuite ?? null,
  tlsGrade: previous?.tlsGrade ?? null,
  tlsScore: previous?.tlsScore ?? null,
  tlsGradeReasons: previous?.tlsGradeReasons ?? [],
  tlsSupportedVersions: previous?.tlsSupportedVersions ?? [],
  ...assessment,
  dns: previous?.dns ?? null,
  flapping: previous?.flapping ?? false,
  chain: previous?.chain ?? [],
  problems: previous?.problems ?? [],
  rawError: null
});

const hostnamePattern = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])$/;
