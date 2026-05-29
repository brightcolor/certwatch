import { describe, expect, it } from "vitest";
import { classifyResult } from "../apps/api/src/checks/status.js";
import type { Monitor } from "../apps/api/src/types.js";

const monitor = {
  warningDays: 30,
  criticalDays: 7,
  validateCertificate: true,
  allowSelfSigned: false
} as Monitor;

describe("certificate status classification", () => {
  it("marks certificates above the warning threshold as OK", () => {
    const result = classifyResult(monitor, healthy(60));
    expect(result.status).toBe("OK");
  });

  it("marks expiring certificates as WARNING", () => {
    const result = classifyResult(monitor, healthy(14));
    expect(result.status).toBe("WARNING");
    expect(result.daysRemaining).toBe(14);
    expect(result.problems.join(" ")).toContain("warning threshold");
  });

  it("marks expired certificates as CRITICAL", () => {
    const result = classifyResult(monitor, healthy(-1));
    expect(result.status).toBe("CRITICAL");
    expect(result.problems.join(" ")).toContain("expired");
  });

  it("marks hostname mismatches as CRITICAL", () => {
    const result = classifyResult(monitor, { ...healthy(60), hostnameMatch: false });
    expect(result.status).toBe("CRITICAL");
  });

  it("marks fingerprint changes as WARNING", () => {
    const result = classifyResult(monitor, { ...healthy(60), previousFingerprint: "old", fingerprint: "new" });
    expect(result.status).toBe("WARNING");
  });
});

const healthy = (days: number) => ({
  validUntil: new Date(Date.now() + days * 86_400_000),
  validFrom: new Date(Date.now() - 86_400_000),
  hostnameMatch: true,
  trusted: true,
  selfSigned: false,
  handshakeOk: true,
  reachable: true,
  tlsVersion: "TLSv1.3",
  fingerprint: "abc"
});
