import { describe, expect, it } from "vitest";
import { renderPublicStatusPage } from "../apps/api/src/routes/publicStatusPage.js";

describe("public status page rendering", () => {
  it("renders a customer-facing status page with opt-in copy", () => {
    const html = renderPublicStatusPage({
      label: "mail",
      title: "sender.report status: mail",
      description: "",
      logoUrl: "",
      hideHostnames: false,
      rollupStatus: "OK",
      counts: { OK: 1 },
      summary: "1 OK, 0 warning, 0 critical/down",
      monitors: [{
        id: "1",
        name: "mail.example.com",
        host: "mail.example.com",
        port: 993,
        status: "OK",
        checkedAt: "2026-05-18T15:00:00.000Z",
        daysRemaining: null,
        message: "IMAP service responded and login succeeded."
      }],
      incidents: []
    }, { subscribePath: "/public/status/mail/subscribe" });

    expect(html).toContain("All systems operational");
    expect(html).toContain("Double opt-in");
    expect(html).toContain("Send opt-in");
  });

  it("escapes monitor content", () => {
    const html = renderPublicStatusPage({
      label: "mail",
      title: "Mail <Status>",
      description: "",
      logoUrl: "",
      hideHostnames: true,
      rollupStatus: "WARNING",
      counts: { WARNING: 1 },
      summary: "0 OK, 1 warning, 0 critical/down",
      monitors: [{
        id: "1",
        name: "<script>alert(1)</script>",
        host: "hidden.example.com",
        port: 993,
        status: "WARNING",
        checkedAt: null,
        daysRemaining: 5,
        message: "Certificate <warning>"
      }],
      incidents: []
    }, { subscribePath: "/public/status/mail/subscribe" });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("hidden.example.com:993");
  });
});
