import type { AlertingSettings, CheckResult } from "../types.js";

export const applyCertificateChangeWatch = (result: CheckResult, previous: CheckResult | undefined, settings: AlertingSettings): CheckResult => {
  if (!settings.certificateChangeAlerts || !previous || result.status === "DOWN") return result;
  const changes = [
    changed("Certificate fingerprint", previous.fingerprintSha256, result.fingerprintSha256),
    changed("Issuer", previous.issuer, result.issuer),
    changed("Valid until", previous.validUntil, result.validUntil),
    changed("Subject alternative names", previous.subjectAltNames.join(", "), result.subjectAltNames.join(", "))
  ].filter(Boolean) as string[];
  if (!changes.length) return result;
  return {
    ...result,
    status: result.status === "OK" ? "WARNING" : result.status,
    severity: result.severity === "info" ? "warning" : result.severity,
    message: `Certificate changed: ${changes[0]}`,
    problems: [...result.problems, ...changes]
  };
};

const changed = (label: string, before?: string | null, after?: string | null) =>
  before && after && before !== after ? `${label} changed from ${before} to ${after}.` : null;
