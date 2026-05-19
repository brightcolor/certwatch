import { describe, expect, it } from "vitest";
import { markFlapping } from "../apps/api/src/checks/flapping.js";
import { gradeTls } from "../apps/api/src/checks/tlsGrade.js";
import { assessTlsSecurity } from "../apps/api/src/checks/tlsSecurity.js";
import { applyResultWatches } from "../apps/api/src/checks/changeWatch.js";
import { isInMaintenance, windowActive } from "../apps/api/src/checks/maintenance.js";
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
  tlsDeteriorationAlerts: true,
  tlsDeteriorationThreshold: 5,
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "07:00",
  quietSuppressCritical: false,
  flappingThreshold: 4
});
