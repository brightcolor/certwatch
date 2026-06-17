import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { incidents } from "../apps/api/src/storage/repositories.js";
import { migrate } from "../apps/api/src/storage/db.js";
import type { CheckResult, Monitor } from "../apps/api/src/types.js";

migrate();

describe("incident comments", () => {
  it("stores a required admin comment while acknowledging an incident", () => {
    const monitor = { id: `monitor-${randomUUID()}` } as Monitor;
    const result = {
      status: "CRITICAL",
      severity: "critical",
      message: "Certificate expired.",
      checkedAt: new Date().toISOString()
    } as CheckResult;

    const opened = incidents.sync(monitor, result);
    const acknowledged = incidents.acknowledge(opened!.id, "admin@example.com", "Ops", "Renewal started.");

    expect(acknowledged?.acknowledgedBy).toBe("admin@example.com");
    expect(acknowledged?.assignee).toBe("Ops");
    expect(acknowledged?.notes).toHaveLength(1);
    expect(acknowledged?.notes[0]?.text).toBe("Renewal started.");
  });
});
