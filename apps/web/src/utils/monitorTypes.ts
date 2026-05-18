const tlsMonitorTypes = new Set([
  "https",
  "tls",
  "smtps",
  "imaps",
  "pop3s",
  "ldaps",
  "ftps",
  "xmpps",
  "smtp_starttls",
  "imap_starttls",
  "pop3_starttls",
  "ftp_starttls"
]);

const secureAlternative: Record<string, string> = {
  smtp: "Transport security Auto, SMTP STARTTLS on 587, or SMTPS on 465",
  imap: "Transport security Auto, IMAP STARTTLS on 143, or IMAPS on 993",
  pop3: "Transport security Auto, POP3 STARTTLS on 110, or POP3S on 995",
  ftp: "Transport security Auto, FTP explicit TLS on 21, or implicit FTPS on 990",
  tcp: "Transport security SSL/TLS or Auto when the target speaks TLS",
  http: "an HTTPS certificate monitor",
  http_login: "an HTTPS certificate monitor plus a separate login check",
  ssh: "an SSH login/banner check; SSH does not expose an X.509 certificate"
};

export type MonitorConfig = Record<string, unknown> | null | undefined;
export type ServiceSecurityMode = "auto" | "plain" | "starttls" | "tls";

export const transportSecurityProtocols = new Set(["tcp", "ftp", "smtp", "imap", "pop3"]);

export const serviceSecurityMode = (type: string, config?: MonitorConfig): ServiceSecurityMode => {
  const mode = String(config?.securityMode ?? "").toLowerCase();
  if (mode === "auto" || mode === "plain" || mode === "starttls" || mode === "tls") return mode;
  return ["ftp", "smtp", "imap", "pop3"].includes(type) ? "auto" : "plain";
};

export const collectsCertificate = (type: string, config?: MonitorConfig, port?: number) => {
  if (tlsMonitorTypes.has(type)) return true;
  if (type === "http" || type === "http_login") return String(config?.scheme ?? (port === 443 ? "https" : "")).toLowerCase() === "https";
  return transportSecurityProtocols.has(type) && serviceSecurityMode(type, config) !== "plain";
};

export const certificateUnavailableMessage = (type: string, config?: MonitorConfig, port?: number) => {
  if (collectsCertificate(type, config, port)) return "No certificate was returned by the latest secure transport check. Run the check again and inspect the latest problem message.";
  const alternative = secureAlternative[type] ?? "a TLS or STARTTLS monitor";
  return `This is a plain ${type.toUpperCase()} service/login check. It verifies service availability or credentials, but it does not collect X.509 certificate details. Use ${alternative} if you want certificate, chain, TLS version, cipher, and grade data.`;
};
