import { describe, expect, it } from "vitest";
import { serviceSecurityMode, serviceTransportAttempts } from "../apps/api/src/checks/serviceSecurity.js";

describe("service transport security", () => {
  it("defaults mail protocols to automatic secure transport", () => {
    expect(serviceSecurityMode({ type: "imap", config: {} } as any)).toBe("auto");
    expect(serviceTransportAttempts({ type: "imap", port: 143, config: {} } as any).map((attempt) => attempt.type)).toEqual(["imap_starttls", "imaps"]);
  });

  it("prefers direct SSL/TLS on implicit TLS ports", () => {
    expect(serviceTransportAttempts({ type: "imap", port: 993, config: { securityMode: "auto" } } as any).map((attempt) => attempt.type)).toEqual(["imaps", "imap_starttls"]);
  });

  it("honors explicit plain and TLS modes", () => {
    expect(serviceTransportAttempts({ type: "smtp", port: 25, config: { securityMode: "plain" } } as any)).toEqual([]);
    expect(serviceTransportAttempts({ type: "smtp", port: 465, config: { securityMode: "tls" } } as any).map((attempt) => attempt.type)).toEqual(["smtps"]);
    expect(serviceTransportAttempts({ type: "tcp", port: 443, config: {} } as any)).toEqual([]);
    expect(serviceTransportAttempts({ type: "tcp", port: 443, config: { securityMode: "auto" } } as any).map((attempt) => attempt.type)).toEqual(["tls"]);
  });
});
