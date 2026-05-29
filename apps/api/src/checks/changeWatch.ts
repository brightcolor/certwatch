import type { AlertingSettings, CheckResult, Monitor, TlsPolicySettings } from "../types.js";
import { dnsChanged } from "./dnsResolution.js";
import { explainTlsGrade } from "./tlsGrade.js";

export const applyResultWatches = (result: CheckResult, previous: CheckResult | undefined, settings: AlertingSettings, monitor?: Monitor, tlsPolicy?: TlsPolicySettings): CheckResult =>
  applyDnsChangeWatch(applySslLabsDeteriorationWatch(applyTlsDeteriorationWatch(applyCertificateChangeWatch(result, previous, settings, monitor), previous, settings, tlsPolicy), previous, settings), previous, settings, monitor);

export const applyCertificateChangeWatch = (result: CheckResult, previous: CheckResult | undefined, settings: AlertingSettings, monitor?: Monitor): CheckResult => {
  if (!certificateWatchEnabled(settings, monitor) || !previous || result.status === "DOWN") return result;
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

const certificateWatchEnabled = (settings: AlertingSettings, monitor?: Monitor) => {
  const mode = String(monitor?.config?.certificateChangeAlertMode ?? "global");
  if (mode === "enabled") return true;
  if (mode === "disabled") return false;
  return settings.certificateChangeAlerts;
};

const applyTlsDeteriorationWatch = (result: CheckResult, previous: CheckResult | undefined, settings: AlertingSettings, tlsPolicy?: TlsPolicySettings): CheckResult => {
  if (!settings.tlsDeteriorationAlerts || !previous || result.status === "DOWN") return result;
  if (previous.tlsScore === null || previous.tlsScore === undefined || result.tlsScore === null || result.tlsScore === undefined) return result;
  const scoreDrop = previous.tlsScore - result.tlsScore;
  const gradeWorse = gradeRank(result.tlsGrade) > gradeRank(previous.tlsGrade);
  if (scoreDrop < (settings.tlsDeteriorationThreshold ?? 5) && !gradeWorse) return result;
  const base = `TLS security deteriorated: ${formatGrade(previous)} -> ${formatGrade(result)}.`;
  const message = withReason(base, tlsDeteriorationReasons(result, previous, tlsPolicy));
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

const applySslLabsDeteriorationWatch = (result: CheckResult, previous: CheckResult | undefined, settings: AlertingSettings): CheckResult => {
  if (!settings.tlsDeteriorationAlerts || !previous || result.status === "DOWN") return result;
  if (!previous.sslLabsGrade || !result.sslLabsGrade) return result;
  const scoreDrop = (previous.sslLabsScore ?? 0) - (result.sslLabsScore ?? 0);
  const gradeWorse = sslLabsRank(result.sslLabsGrade) > sslLabsRank(previous.sslLabsGrade);
  if (scoreDrop < (settings.tlsDeteriorationThreshold ?? 5) && !gradeWorse) return result;
  const base = `SSL Labs assessment deteriorated: ${previous.sslLabsGrade} -> ${result.sslLabsGrade}.`;
  const message = withReason(base, sslLabsDeteriorationReasons(result, previous, scoreDrop));
  return {
    ...result,
    status: result.status === "OK" ? "WARNING" : result.status,
    severity: result.severity === "info" ? "warning" : result.severity,
    message,
    problems: [...result.problems, message]
  };
};

const sslLabsRank = (grade?: string | null) => ({ "A+": 0, A: 1, "A-": 2, B: 3, C: 4, D: 5, E: 6, F: 7, T: 8, M: 8 }[grade ?? ""] ?? 0);

const tlsDeteriorationReasons = (result: CheckResult, previous: CheckResult, tlsPolicy?: TlsPolicySettings) => {
  const previousReasons = new Set(explainTlsGrade(previous, tlsPolicy).map((item) => item.reason));
  const currentReasons = explainTlsGrade(result, tlsPolicy);
  const newReasons = currentReasons.filter((item) => !previousReasons.has(item.reason));
  const gradeReasons = (newReasons.length ? newReasons : currentReasons).map((item) => `${item.reason} (-${item.points})`);
  const newProblems = result.problems.filter((problem) => !previous.problems.includes(problem));
  return [...newProblems, ...gradeReasons];
};

const sslLabsDeteriorationReasons = (result: CheckResult, previous: CheckResult, scoreDrop: number) => [
  ...(scoreDrop > 0 ? [`SSL Labs score dropped by ${scoreDrop} points.`] : []),
  ...(result.sslLabsFindings ?? []).filter((finding) => !(previous.sslLabsFindings ?? []).includes(finding))
];

const withReason = (message: string, reasons: string[]) => {
  const unique = [...new Set(reasons.filter(Boolean))].slice(0, 4);
  return unique.length ? `${message} Reason: ${unique.join(" ")}` : `${message} Reason: the new check produced a lower security grade.`;
};

const applyDnsChangeWatch = (result: CheckResult, previous: CheckResult | undefined, settings: AlertingSettings, monitor?: Monitor): CheckResult => {
  if (!dnsWatchEnabled(settings, monitor) || !result.dns?.fresh || result.status === "DOWN") return result;
  const changes = [
    dnsChanged(result.dns, previous?.dns) ? `DNS resolution changed from ${format(previous?.dns?.addresses)} to ${format(result.dns.addresses)}.` : null,
    ...result.dns.mismatches.map((mismatch) => `DNS resolver mismatch: ${mismatch}`)
  ].filter(Boolean) as string[];
  if (!changes.length) return result;
  return {
    ...result,
    status: result.status === "OK" ? "WARNING" : result.status,
    severity: result.severity === "info" ? "warning" : result.severity,
    message: changes[0],
    problems: [...new Set([...result.problems, ...changes])]
  };
};

const dnsWatchEnabled = (settings: AlertingSettings, monitor?: Monitor) => {
  const mode = String(monitor?.config?.dnsChangeAlertMode ?? "global");
  if (mode === "enabled") return true;
  if (mode === "disabled") return false;
  return settings.dnsChangeAlerts;
};

const format = (values?: string[]) => values?.length ? values.join(", ") : "none";
