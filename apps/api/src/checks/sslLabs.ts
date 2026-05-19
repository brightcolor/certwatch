import net from "node:net";
import type { CheckResult, Monitor, SslLabsSettings } from "../types.js";
import { nowIso } from "../utils/time.js";

const apiBase = "https://api.ssllabs.com/api/v4";

type SslLabsEndpoint = {
  ipAddress?: string;
  grade?: string;
  gradeTrustIgnored?: string;
  futureGrade?: string;
  hasWarnings?: boolean;
  statusMessage?: string;
  details?: {
    protocols?: Array<{ name?: string; version?: string; q?: number | null }>;
    supportsRc4?: boolean;
    heartbleed?: boolean;
    poodle?: boolean;
    drownErrors?: boolean;
  };
};

type SslLabsReport = {
  host?: string;
  port?: number;
  status?: string;
  statusMessage?: string;
  testTime?: number;
  endpoints?: SslLabsEndpoint[];
};

export type SslLabsAssessment = Pick<CheckResult, "sslLabsGrade" | "sslLabsScore" | "sslLabsStatus" | "sslLabsUrl" | "sslLabsCheckedAt" | "sslLabsFindings">;

export const shouldRunSslLabs = (monitor: Monitor, previous: CheckResult | undefined, settings: SslLabsSettings) => {
  if (!settings.enabled || !settings.registeredEmail || !sslLabsSupported(monitor)) return false;
  const last = previous?.sslLabsCheckedAt;
  return !last || Date.now() - new Date(last).getTime() >= settings.intervalHours * 3_600_000;
};

export const sslLabsSupported = (monitor: Pick<Monitor, "host" | "port" | "type" | "config">) => {
  if (!monitor.config?.sslLabsEnabled) return false;
  if (monitor.port !== 443) return false;
  if (!["https", "tls", "http", "http_login"].includes(monitor.type)) return false;
  return !isPrivateLiteral(monitor.host);
};

export const mergePreviousSslLabs = (result: CheckResult, previous?: CheckResult): CheckResult => ({
  ...result,
  sslLabsGrade: previous?.sslLabsGrade ?? result.sslLabsGrade ?? null,
  sslLabsScore: previous?.sslLabsScore ?? result.sslLabsScore ?? null,
  sslLabsStatus: previous?.sslLabsStatus ?? result.sslLabsStatus ?? null,
  sslLabsUrl: previous?.sslLabsUrl ?? result.sslLabsUrl ?? null,
  sslLabsCheckedAt: previous?.sslLabsCheckedAt ?? result.sslLabsCheckedAt ?? null,
  sslLabsFindings: previous?.sslLabsFindings ?? result.sslLabsFindings ?? []
});

export const enrichWithSslLabs = async (monitor: Monitor, result: CheckResult, previous: CheckResult | undefined, settings: SslLabsSettings, reusable?: CheckResult): Promise<CheckResult> => {
  if (!settings.enabled || !settings.registeredEmail || !sslLabsSupported(monitor)) return result;
  const cached = reusable ?? previous;
  if (!shouldRunSslLabs(monitor, cached, settings)) return mergePreviousSslLabs(result, cached);
  try {
    const assessment = await runSslLabsAssessment(monitor.host, settings);
    return { ...result, ...assessment };
  } catch (error) {
    return {
      ...mergePreviousSslLabs(result, previous),
      sslLabsStatus: "ERROR",
      sslLabsCheckedAt: nowIso(),
      sslLabsFindings: [`SSL Labs assessment failed: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
};

export const runSslLabsAssessment = async (host: string, settings: SslLabsSettings): Promise<SslLabsAssessment> => {
  const started = Date.now();
  const first = await analyze(host, settings, settings.startNewScans ? "start" : "cache");
  let report = first;
  while (!finished(report) && Date.now() - started < settings.timeoutSeconds * 1000) {
    await sleep(report.status === "IN_PROGRESS" ? 10_000 : 5_000);
    report = await analyze(host, settings, "poll");
  }
  return normalizeSslLabsReport(report, host);
};

export const normalizeSslLabsReport = (report: SslLabsReport, host: string): SslLabsAssessment => {
  const endpoints = report.endpoints ?? [];
  const grade = worstGrade(endpoints.map((endpoint) => endpoint.grade).filter(Boolean) as string[]);
  const checkedAt = report.testTime ? new Date(report.testTime).toISOString() : nowIso();
  return {
    sslLabsGrade: grade,
    sslLabsScore: grade ? gradeToScore(grade) : null,
    sslLabsStatus: report.status ?? null,
    sslLabsUrl: `https://www.ssllabs.com/ssltest/analyze.html?d=${encodeURIComponent(host)}`,
    sslLabsCheckedAt: checkedAt,
    sslLabsFindings: findingsFor(report, endpoints)
  };
};

export const gradeToScore = (grade?: string | null) => {
  const rank: Record<string, number> = { "A+": 100, A: 95, "A-": 90, B: 80, C: 65, D: 50, E: 35, F: 20, T: 10, M: 10 };
  return rank[grade ?? ""] ?? null;
};

const analyze = async (host: string, settings: SslLabsSettings, mode: "cache" | "start" | "poll") => {
  const params = new URLSearchParams({ host, all: "done", publish: settings.publishResults ? "on" : "off" });
  if (mode === "cache") {
    params.set("fromCache", "on");
    params.set("maxAge", String(settings.maxAgeHours));
  }
  if (mode === "start") params.set("startNew", "on");
  const response = await fetch(`${apiBase}/analyze?${params}`, {
    headers: { email: settings.registeredEmail },
    signal: AbortSignal.timeout(Math.min(settings.timeoutSeconds, 30) * 1000)
  });
  if (!response.ok) throw new Error(`SSL Labs API returned HTTP ${response.status}.`);
  return response.json() as Promise<SslLabsReport>;
};

const finished = (report: SslLabsReport) => report.status === "READY" || report.status === "ERROR";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const worstGrade = (grades: string[]) =>
  grades.sort((a, b) => (gradeToScore(a) ?? 0) - (gradeToScore(b) ?? 0))[0] ?? null;

const findingsFor = (report: SslLabsReport, endpoints: SslLabsEndpoint[]) => {
  const findings = new Set<string>();
  if (report.statusMessage) findings.add(`SSL Labs: ${report.statusMessage}`);
  if (report.status && report.status !== "READY") findings.add(`SSL Labs status: ${report.status}.`);
  for (const endpoint of endpoints) {
    const label = endpoint.ipAddress ? `endpoint ${endpoint.ipAddress}` : "endpoint";
    if (endpoint.statusMessage && endpoint.statusMessage !== "Ready") findings.add(`SSL Labs ${label}: ${endpoint.statusMessage}.`);
    if (endpoint.hasWarnings) findings.add(`SSL Labs ${label}: warnings affect the score.`);
    if (endpoint.futureGrade && endpoint.futureGrade !== endpoint.grade) findings.add(`SSL Labs ${label}: future grade is ${endpoint.futureGrade}.`);
    if (endpoint.gradeTrustIgnored && endpoint.gradeTrustIgnored !== endpoint.grade) findings.add(`SSL Labs ${label}: trust issues lower the grade from ${endpoint.gradeTrustIgnored} to ${endpoint.grade}.`);
    for (const protocol of endpoint.details?.protocols ?? []) {
      const name = [protocol.name, protocol.version].filter(Boolean).join(" ");
      if (protocol.q === 0 || /SSL|TLS 1\.0|TLS 1\.1/i.test(name)) findings.add(`SSL Labs ${label}: deprecated protocol supported (${name}).`);
    }
    if (endpoint.details?.supportsRc4) findings.add(`SSL Labs ${label}: RC4 is supported.`);
    if (endpoint.details?.heartbleed) findings.add(`SSL Labs ${label}: Heartbleed vulnerability detected.`);
    if (endpoint.details?.poodle) findings.add(`SSL Labs ${label}: POODLE vulnerability detected.`);
  }
  return [...findings].slice(0, 20);
};

const isPrivateLiteral = (host: string) => {
  if (net.isIP(host) === 0) return false;
  return [
    /^10\./,
    /^127\./,
    /^169\.254\./,
    /^172\.(1[6-9]|2\d|3[0-1])\./,
    /^192\.168\./,
    /^::1$/,
    /^fc/i,
    /^fd/i
  ].some((range) => range.test(host));
};
