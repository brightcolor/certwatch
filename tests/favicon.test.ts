import { describe, expect, it } from "vitest";
import { needsFaviconAttention } from "../apps/web/src/utils/favicon.js";

describe("favicon status signal", () => {
  it("stays calm when all actionable states are empty", () => {
    expect(needsFaviconAttention({ warning: 0, critical: 0, down: 0, unknown: 0 })).toBe(false);
  });

  it("requires attention for warning, critical, down, or unknown states", () => {
    expect(needsFaviconAttention({ warning: 1 })).toBe(true);
    expect(needsFaviconAttention({ critical: 1 })).toBe(true);
    expect(needsFaviconAttention({ down: 1 })).toBe(true);
    expect(needsFaviconAttention({ unknown: 1 })).toBe(true);
  });
});
