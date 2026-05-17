import { describe, expect, it } from "vitest";
import { markFlapping } from "../apps/api/src/checks/flapping.js";
import { gradeTls } from "../apps/api/src/checks/tlsGrade.js";
import type { CheckResult } from "../apps/api/src/types.js";

describe("TLS security grading", () => {
  it("keeps modern healthy TLS in the A range", () => {
    const grade = gradeTls({ status: "OK", problems: [], tlsVersion: "TLSv1.3", cipherSuite: "TLS_AES_256_GCM_SHA384", daysRemaining: 90 });

    expect(grade.tlsGrade).toBe("A");
    expect(grade.tlsScore).toBe(100);
  });

  it("penalizes weak protocols and trust problems", () => {
    const grade = gradeTls({ status: "CRITICAL", problems: ["Certificate chain is not trusted."], tlsVersion: "TLSv1", cipherSuite: "TLS_RSA_WITH_3DES_EDE_CBC_SHA", daysRemaining: 3 });

    expect(grade.tlsGrade).toBe("F");
    expect(grade.tlsScore).toBeLessThan(50);
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
