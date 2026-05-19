import type { AlertingSettings, CheckResult } from "../types.js";

export const applyResultWatches = (result: CheckResult, previous: CheckResult | undefined, settings: AlertingSettings): CheckResult =>
  applyTlsDeteriorationWatch(applyCertificateChangeWatch(result, previous, settings), previous, settings);

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

const applyTlsDeteriorationWatch = (result: CheckResult, previous: CheckResult | undefined, settings: AlertingSettings): CheckResult => {
  if (!settings.tlsDeteriorationAlerts || !previous || result.status === "DOWN") return result;
  if (previous.tlsScore === null || previous.tlsScore === undefined || result.tlsScore === null || result.tlsScore === undefined) return result;
  const scoreDrop = previous.tlsScore - result.tlsScore;
  const gradeWorse = gradeRank(result.tlsGrade) > gradeRank(previous.tlsGrade);
  if (scoreDrop < (settings.tlsDeteriorationThreshold ?? 5) && !gradeWorse) return result;
  const message = `TLS security deteriorated: ${formatGrade(previous)} -> ${formatGrade(result)}.`;
  return {
    ...result,
    status: result.status === "OK" ? "WARNING" : result.status,
    severity: result.severity === "info" ? "warning" : result.severity,
    message,
    problems: [...result.problems, message]
  };
};

const gradeRank = (grade?: string | null) => ({ A: 0, B: 1, C: 2, D: 3, F: 4 }[grade ?? ""] ?? 0);
const formatGrade = (result: CheckResult) => `${result.tlsGrade ?? "-"} (${result.tlsScore ?? "-"} points)`;
