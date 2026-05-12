import { describe, expect, it } from "vitest";
import { validateHost, validatePort } from "../apps/api/src/checks/validation.js";

describe("target validation", () => {
  it("normalizes hostnames and strips URL prefixes", () => {
    expect(validateHost("https://Example.COM/path")).toBe("example.com");
  });

  it("rejects invalid ports", () => {
    expect(() => validatePort(70000)).toThrow("Port");
  });

  it("rejects malformed hostnames", () => {
    expect(() => validateHost("bad host name")).toThrow("Host");
  });
});
