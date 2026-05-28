import { describe, expect, it } from "vitest";
import { badgeLabelFromQuery, renderStatusBadge } from "../apps/api/src/routes/publicBadge.js";

describe("public badge rendering", () => {
  it("renders long labels without fixed column overlap", () => {
    const svg = renderStatusBadge({
      label: "www.very-long-customer-facing-hostname.bright-color.example.com",
      value: "OK 42d",
      status: "OK"
    });
    const width = Number(svg.match(/width="(\d+)"/)?.[1]);

    expect(width).toBeGreaterThan(190);
    expect(width).toBeLessThanOrEqual(510);
    expect(svg).toContain("...");
    expect(svg).toContain("clipPath");
    expect(svg).toContain('preserveAspectRatio="xMinYMid meet"');
    expect(svg).not.toContain('width="190"');
  });

  it("uses query labels and aliases for embed-friendly badges", () => {
    expect(badgeLabelFromQuery({ label: "Mail Gateway" }, "fallback")).toBe("Mail Gateway");
    expect(badgeLabelFromQuery({ alias: "Customer A" }, "fallback")).toBe("Customer A");
    expect(badgeLabelFromQuery({}, "fallback")).toBe("fallback");
  });

  it("escapes badge text", () => {
    const svg = renderStatusBadge({ label: '<mail "&">', value: "OK", status: "OK" });

    expect(svg).not.toContain('<mail "&">');
    expect(svg).toContain("&lt;mail &quot;&amp;&quot;&gt;");
  });
});
