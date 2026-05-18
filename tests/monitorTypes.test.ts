import { describe, expect, it } from "vitest";
import { certificateUnavailableMessage, collectsCertificate } from "../apps/web/src/utils/monitorTypes.js";

describe("monitor type certificate hints", () => {
  it("detects monitor types that collect certificates", () => {
    expect(collectsCertificate("imap")).toBe(true);
    expect(collectsCertificate("imap", { securityMode: "plain" })).toBe(false);
    expect(collectsCertificate("imap_starttls")).toBe(true);
    expect(collectsCertificate("imaps")).toBe(true);
    expect(collectsCertificate("http_login", { scheme: "https" })).toBe(true);
    expect(collectsCertificate("tcp")).toBe(false);
    expect(collectsCertificate("tcp", { securityMode: "tls" })).toBe(true);
  });

  it("explains why plain service checks have no certificate data", () => {
    expect(certificateUnavailableMessage("imap", { securityMode: "plain" })).toContain("IMAP STARTTLS on 143");
  });
});
