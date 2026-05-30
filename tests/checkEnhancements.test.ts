import { describe, expect, it } from "vitest";
import { markFlapping } from "../apps/api/src/checks/flapping.js";
import { explainTlsGrade, gradeTls } from "../apps/api/src/checks/tlsGrade.js";
import { assessTlsSecurity } from "../apps/api/src/checks/tlsSecurity.js";
import { applyResultWatches } from "../apps/api/src/checks/changeWatch.js";
import { isInMaintenance, windowActive } from "../apps/api/src/checks/maintenance.js";
import { normalizeSslLabsReport, shouldRunSslLabs } from "../apps/api/src/checks/sslLabs.js";
import { compareDnsAnswers, shouldRunDnsResolution } from "../apps/api/src/checks/dnsResolution.js";
import { buildManualSslLabsResult, normalizeSslLabsHost } from "../apps/api/src/checks/sslLabsManual.js";
import type { AlertingSettings, CheckResult } from "../apps/api/src/types.js";

describe("TLS security grading", () => {
  it("keeps modern healthy TLS in the A range", () => {
    const grade = gradeTls({ status: "OK", problems: [], tlsVersion: "TLSv1.3", cipherSuite: "TLS_AES_256_GCM_SHA384", daysRemaining: 90, subjectAltNames: ["example.com"] });

    expect(grade.tlsGrade).toBe("A");
    expect(grade.tlsScore).toBe(100);
  });

  it("penalizes weak protocols and trust problems", () => {
    const grade = gradeTls({ status: "CRITICAL", problems: ["Certificate chain is not trusted."], tlsVersion: "TLSv1", cipherSuite: "TLS_RSA_WITH_3DES_EDE_CBC_SHA", daysRemaining: 3, subjectAltNames: [] });

    expect(grade.tlsGrade).toBe("F");
    expect(grade.tlsScore).toBeLessThan(50);
  });

  it("explains TLS grade deductions", () => {
    const reasons = explainTlsGrade({ status: "WARNING", problems: [], tlsVersion: "TLSv1.2", cipherSuite: "TLS_AES_256_GCM_SHA384", daysRemaining: 10, subjectAltNames: ["example.com"] });

    expect(reasons.map((item) => item.reason).join(" ")).toContain("WARNING");
    expect(reasons.map((item) => item.reason).join(" ")).toContain("expires");
  });

  it("reports intensive TLS assessment findings", () => {
    const findings = assessTlsSecurity({
      tlsVersion: "TLSv1.2",
      cipherSuite: "TLS_RSA_WITH_AES_128_CBC_SHA",
      keyType: "rsa",
      keySize: 1024,
      namedCurve: null,
      chainLength: 1,
      supportedVersions: ["TLSv1", "TLSv1.2"]
    }, { profile: "modern", minimumTlsVersion: "TLSv1.2", weakCipherPenalty: 40, requireSan: true, intensiveScan: true });

    expect(findings.map((finding) => finding.message).join(" ")).toContain("deprecated protocols");
    expect(findings.some((finding) => finding.severity === "critical")).toBe(true);
  });

  it("warns when the TLS grade deteriorates", () => {
    const result = applyResultWatches(
      { ...resultFor("OK"), tlsGrade: "C", tlsScore: 70, fingerprintSha256: "abc" },
      { ...resultFor("OK"), tlsGrade: "A", tlsScore: 95, fingerprintSha256: "abc" },
      alertingSettings()
    );

    expect(result.status).toBe("WARNING");
    expect(result.message).toContain("TLS security deteriorated");
    expect(result.message).toContain("Reason:");
  });

  it("warns when the SSL Labs grade deteriorates", () => {
    const result = applyResultWatches(
      { ...resultFor("OK"), sslLabsGrade: "C", sslLabsScore: 65, fingerprintSha256: "abc" },
      { ...resultFor("OK"), sslLabsGrade: "A", sslLabsScore: 95, fingerprintSha256: "abc" },
      alertingSettings()
    );

    expect(result.status).toBe("WARNING");
    expect(result.message).toContain("SSL Labs assessment deteriorated");
  });

  it("warns when DNS resolution changes and DNS alerts are enabled", () => {
    const result = applyResultWatches(
      { ...resultFor("OK"), dns: dnsResult(["203.0.113.20"], "new") },
      { ...resultFor("OK"), dns: dnsResult(["203.0.113.10"], "old") },
      { ...alertingSettings(), dnsChangeAlerts: true }
    );

    expect(result.status).toBe("WARNING");
    expect(result.message).toContain("DNS resolution changed");
  });
});

describe("DNS resolver comparison", () => {
  it("detects public resolver differences against authoritative DNS", () => {
    const mismatches = compareDnsAnswers(
      { name: "Authoritative DNS", kind: "authoritative", servers: ["ns1.example.com"], addresses: ["203.0.113.10"] },
      [
        { name: "Cloudflare", kind: "public", servers: ["1.1.1.1"], addresses: ["203.0.113.10"] },
        { name: "Google", kind: "public", servers: ["8.8.8.8"], addresses: ["203.0.113.20"] }
      ]
    );

    expect(mismatches.join(" ")).toContain("Google differs");
  });

  it("honors the custom DNS check interval", () => {
    const previous = { dns: dnsResult(["203.0.113.10"], "same") };
    expect(shouldRunDnsResolution({ config: { dnsCheckIntervalSeconds: 3600 } }, previous)).toBe(false);
  });
});

describe("SSL Labs assessment normalization", () => {
  it("normalizes manual SSL Labs trigger hosts", () => {
    expect(normalizeSslLabsHost("https://Example.COM:443/path")).toBe("example.com");
    expect(() => normalizeSslLabsHost("localhost")).toThrow("valid public hostname");
  });

  it("uses the worst endpoint grade and extracts findings", () => {
    const result = normalizeSslLabsReport({
      status: "READY",
      testTime: Date.UTC(2026, 4, 19),
      endpoints: [
        { ipAddress: "203.0.113.10", grade: "A", statusMessage: "Ready" },
        { ipAddress: "203.0.113.11", grade: "C", hasWarnings: true, details: { protocols: [{ name: "TLS", version: "1.0", q: 0 }] } }
      ]
    }, "example.com");

    expect(result.sslLabsGrade).toBe("C");
    expect(result.sslLabsScore).toBe(65);
    expect(result.sslLabsFindings?.join(" ")).toContain("deprecated protocol");
  });

  it("limits fresh assessments to the configured host interval", () => {
    const monitor = { host: "example.com", port: 443, type: "https", config: { sslLabsEnabled: true } } as any;
    const settings = { enabled: true, registeredEmail: "ops@example.com", intervalHours: 24, maxAgeHours: 24, timeoutSeconds: 90, startNewScans: false, publishResults: false };
    const previous = { ...resultFor("OK"), sslLabsCheckedAt: new Date().toISOString() };

    expect(shouldRunSslLabs(monitor, previous, settings)).toBe(false);
  });

  it("stores manual SSL Labs assessments without dropping certificate context", () => {
    const previous = { ...resultFor("OK"), commonName: "example.com", subjectAltNames: ["example.com"], sslLabsGrade: "A" };
    const result = buildManualSslLabsResult({ id: "monitor-1", lastStatus: "OK" } as any, previous, {
      sslLabsGrade: "B",
      sslLabsScore: 80,
      sslLabsStatus: "READY",
      sslLabsUrl: "https://www.ssllabs.com/ssltest/analyze.html?d=example.com",
      sslLabsCheckedAt: new Date().toISOString(),
      sslLabsFindings: ["SSL Labs endpoint: warnings affect the score."]
    });

    expect(result.commonName).toBe("example.com");
    expect(result.sslLabsGrade).toBe("B");
    expect(result.message).toContain("Manual SSL Labs assessment completed");
  });
});

describe("flapping detection", () => {
  it("marks repeated state changes as warning when the current result is OK", () => {
    const result = markFlapping(resultFor("OK"), [resultFor("DOWN"), resultFor("OK"), resultFor("DOWN")], 3);

    expect(result.flapping).toBe(true);
    expect(result.status).toBe("WARNING");
    expect(result.problems).toContain("Monitor is flapping between states.");
  });
});

describe("maintenance windows", () => {
  it("matches daily clock windows", () => {
    expect(windowActive("daily 22:00-23:00", new Date("2026-05-17T22:30:00"))).toBe(true);
    expect(windowActive("daily 22:00-23:00", new Date("2026-05-17T23:30:00"))).toBe(false);
  });

  it("matches label-scoped windows", () => {
    expect(isInMaintenance({ tags: ["prod"] } as any, { windows: [{ id: "1", name: "prod", tags: ["prod"], window: "daily 01:00-02:00", enabled: true }] }, new Date("2026-05-17T01:30:00"))).toBe(true);
  });
});

const resultFor = (status: CheckResult["status"]): CheckResult => ({
  id: crypto.randomUUID(),
  monitorId: "monitor-1",
  status,
  severity: status === "OK" ? "info" : "critical",
  message: status,
  checkedAt: new Date().toISOString(),
  durationMs: 1,
  subjectAltNames: [],
  chain: [],
  problems: []
});

const alertingSettings = (): AlertingSettings => ({
  resendAfterHours: 24,
  recoveryEnabled: true,
  certificateChangeAlerts: true,
  dnsChangeAlerts: false,
  tlsDeteriorationAlerts: true,
  tlsDeteriorationThreshold: 5,
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "07:00",
  quietSuppressCritical: false,
  flappingThreshold: 4
});

const dnsResult = (addresses: string[], fingerprint: string) => ({
  host: "example.com",
  checkedAt: new Date().toISOString(),
  fresh: true,
  addresses,
  authoritativeZone: "example.com",
  authoritativeNameservers: ["ns1.example.com"],
  checks: [],
  mismatches: [],
  fingerprint
});
