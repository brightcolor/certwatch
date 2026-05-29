import type { CheckResult, Monitor, Severity } from "../types.js";
import { daysBetween } from "../utils/time.js";

export interface StatusInput {
  validUntil?: Date;
  validFrom?: Date;
  hostnameMatch: boolean;
  trusted: boolean;
  selfSigned: boolean;
  handshakeOk: boolean;
  reachable: boolean;
  tlsVersion?: string;
  previousFingerprint?: string | null;
  fingerprint?: string | null;
  startTlsMissing?: boolean;
  chainProblems?: string[];
}

export const classifyResult = (monitor: Monitor, input: StatusInput) => {
  const problems: string[] = [...(input.chainProblems ?? [])];
  if (!input.reachable) problems.push("Target is not reachable.");
  if (!input.handshakeOk) problems.push("TLS handshake failed.");
  if (input.startTlsMissing) problems.push("STARTTLS was not advertised.");
  if (!input.hostnameMatch) problems.push("Certificate hostname does not match the target.");
  if (!input.trusted && monitor.validateCertificate) problems.push("Certificate chain is not trusted.");
  if (input.selfSigned && !monitor.allowSelfSigned) problems.push("Certificate appears to be self-signed.");

  const daysRemaining = input.validUntil ? daysBetween(new Date(), input.validUntil) : null;
  const expired = Boolean(input.validUntil && input.validUntil.getTime() < Date.now());
  if (expired) problems.push("Certificate has expired.");
  if (input.validFrom && input.validFrom.getTime() > Date.now()) problems.push("Certificate is not valid yet.");
  if (input.tlsVersion && ["TLSv1", "TLSv1.1"].includes(input.tlsVersion)) problems.push(`Weak TLS protocol negotiated: ${input.tlsVersion}.`);

  const critical = !input.reachable || !input.handshakeOk || input.startTlsMissing || !input.hostnameMatch;
  const invalid = expired;
  const belowCritical = daysRemaining !== null && daysRemaining <= monitor.criticalDays;
  const belowWarning = daysRemaining !== null && daysRemaining <= monitor.warningDays;
  const certChanged = Boolean(input.previousFingerprint && input.fingerprint && input.previousFingerprint !== input.fingerprint);
  if (!expired && belowCritical) problems.push(`Certificate expires in ${daysRemaining} days, at or below the critical threshold of ${monitor.criticalDays} days.`);
  else if (!expired && belowWarning) problems.push(`Certificate expires in ${daysRemaining} days, at or below the warning threshold of ${monitor.warningDays} days.`);

  if (critical || invalid || belowCritical || (!input.trusted && monitor.validateCertificate) || (input.selfSigned && !monitor.allowSelfSigned)) {
    return { status: "CRITICAL" as const, severity: "critical" as Severity, daysRemaining, problems };
  }
  if (belowWarning || certChanged || (input.tlsVersion && ["TLSv1", "TLSv1.1"].includes(input.tlsVersion))) {
    if (certChanged) problems.push("Certificate fingerprint changed since the previous check.");
    return { status: "WARNING" as const, severity: "warning" as Severity, daysRemaining, problems };
  }
  return { status: "OK" as const, severity: "info" as Severity, daysRemaining, problems };
};

export const alertFingerprint = (result: CheckResult) =>
  [result.status, result.severity, result.fingerprintSha256 ?? "", result.problems.join("|")].join(":");
