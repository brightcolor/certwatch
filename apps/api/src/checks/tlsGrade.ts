import type { CheckResult, TlsPolicySettings } from "../types.js";

type TlsGradeInput = Pick<CheckResult, "status" | "problems" | "tlsVersion" | "cipherSuite" | "daysRemaining"> & { subjectAltNames?: string[]; tlsSupportedVersions?: string[] };
export type TlsGradeReason = { reason: string; points: number };

export const gradeTls = (result: TlsGradeInput, policy: TlsPolicySettings = defaultPolicy) => {
  const tlsGradeReasons = explainTlsGrade(result, policy);
  const score = Math.max(0, Math.min(100, 100 - tlsGradeReasons.reduce((sum, item) => sum + item.points, 0)));
  return { tlsScore: score, tlsGrade: gradeFor(score), tlsGradeReasons };
};

export const explainTlsGrade = (result: TlsGradeInput, policy: TlsPolicySettings = defaultPolicy): TlsGradeReason[] => {
  const deductions: TlsGradeReason[] = [];
  if (result.status === "DOWN") deductions.push({ reason: "Monitor status is DOWN.", points: 70 });
  if (result.status === "CRITICAL") deductions.push({ reason: "Monitor status is CRITICAL.", points: 45 });
  if (result.status === "WARNING") deductions.push({ reason: "Monitor status is WARNING.", points: 15 });
  if (result.tlsVersion && versionRank(result.tlsVersion) < versionRank(policy.minimumTlsVersion)) deductions.push({ reason: `Negotiated TLS version ${result.tlsVersion} is below the configured minimum ${policy.minimumTlsVersion}.`, points: 35 });
  if (!result.tlsVersion) deductions.push({ reason: "No TLS version was negotiated or recorded.", points: 20 });
  if (/RC4|3DES|DES|NULL|MD5/i.test(result.cipherSuite ?? "")) deductions.push({ reason: `Weak cipher suite negotiated: ${result.cipherSuite}.`, points: policy.weakCipherPenalty });
  if (/CBC/i.test(result.cipherSuite ?? "")) deductions.push({ reason: `CBC-mode cipher suite negotiated: ${result.cipherSuite}.`, points: 15 });
  if (/^TLS_RSA_|_RSA_WITH_/i.test(result.cipherSuite ?? "") && !/ECDHE|DHE/i.test(result.cipherSuite ?? "")) deductions.push({ reason: `Cipher suite lacks forward secrecy: ${result.cipherSuite}.`, points: 20 });
  if ((result.tlsSupportedVersions ?? []).some((version) => version === "TLSv1" || version === "TLSv1.1")) deductions.push({ reason: "Deprecated TLSv1/TLSv1.1 protocols are still supported.", points: 20 });
  if (policy.profile === "strict" && (result.tlsSupportedVersions ?? []).length && !result.tlsSupportedVersions?.includes("TLSv1.3")) deductions.push({ reason: "Strict TLS policy requires TLSv1.3 support.", points: 10 });
  if (policy.requireSan && (result.subjectAltNames ?? []).length === 0) deductions.push({ reason: "Certificate has no Subject Alternative Names.", points: 10 });
  if (result.daysRemaining !== null && result.daysRemaining !== undefined && result.daysRemaining <= 14) deductions.push({ reason: `Certificate expires in ${result.daysRemaining} days.`, points: 20 });
  if (result.problems.some((problem) => /not trusted|hostname|expired|self-signed/i.test(problem))) deductions.push({ reason: "Certificate trust, hostname, expiry, or self-signed problem is present.", points: 35 });
  if (result.problems.some((problem) => /TLS assessment:.*critical|weak cipher|only \d+ bits|no modern TLS/i.test(problem))) deductions.push({ reason: "Intensive TLS assessment reported a critical or weak configuration finding.", points: 25 });
  return deductions;
};

const gradeFor = (score: number) => score >= 90 ? "A" : score >= 80 ? "B" : score >= 65 ? "C" : score >= 50 ? "D" : "F";
const defaultPolicy: TlsPolicySettings = { profile: "modern", minimumTlsVersion: "TLSv1.2", weakCipherPenalty: 40, requireSan: true, intensiveScan: true };
const versionRank = (version: string) => ({ TLSv1: 1, "TLSv1.1": 2, "TLSv1.2": 3, "TLSv1.3": 4 }[version] ?? 0);
