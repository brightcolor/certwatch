import { describe, expect, it } from "vitest";
import { buildPayload } from "../apps/api/src/notifications/service.js";
import type { CheckResult, Monitor } from "../apps/api/src/types.js";

describe("notification payload", () => {
  it("contains the required webhook fields", () => {
    const payload = buildPayload({ id: "m1", name: "Example", host: "example.com", port: 443 } as Monitor, {
      status: "CRITICAL",
      severity: "critical",
      message: "expires soon",
      checkedAt: "2026-05-12T10:00:00Z",
      daysRemaining: 7,
      validUntil: "2026-06-01T12:00:00Z",
      issuer: "Let's Encrypt",
      fingerprintSha256: "abc"
    } as CheckResult);
    expect(payload).toMatchObject({
      monitor_id: "m1",
      monitor_name: "Example",
      host: "example.com",
      status: "critical",
      severity: "critical",
      days_remaining: 7
    });
  });
});
