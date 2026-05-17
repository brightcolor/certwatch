import type { CheckResult } from "../types.js";

export const gradeTls = (result: Pick<CheckResult, "status" | "problems" | "tlsVersion" | "cipherSuite" | "daysRemaining">) => {
  let score = 100;
  if (result.status === "DOWN") score -= 70;
  if (result.status === "CRITICAL") score -= 45;
  if (result.status === "WARNING") score -= 15;
  if (result.tlsVersion === "TLSv1" || result.tlsVersion === "TLSv1.1") score -= 35;
  if (!result.tlsVersion) score -= 20;
  if (/RC4|3DES|DES|NULL|MD5/i.test(result.cipherSuite ?? "")) score -= 40;
  if (result.daysRemaining !== null && result.daysRemaining !== undefined && result.daysRemaining <= 14) score -= 20;
  if (result.problems.some((problem) => /not trusted|hostname|expired|self-signed/i.test(problem))) score -= 35;
  score = Math.max(0, Math.min(100, score));
  return { tlsScore: score, tlsGrade: gradeFor(score) };
};

const gradeFor = (score: number) => score >= 90 ? "A" : score >= 80 ? "B" : score >= 65 ? "C" : score >= 50 ? "D" : "F";
