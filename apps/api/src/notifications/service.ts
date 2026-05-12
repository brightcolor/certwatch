import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import type { CheckResult, Monitor, NotificationChannel, Severity } from "../types.js";
import { alerts } from "../storage/repositories.js";
import { alertFingerprint } from "../checks/status.js";

export const dispatchAlerts = async (monitor: Monitor, result: CheckResult, configured: NotificationChannel[]) => {
  if (result.severity === "info" && result.status === "OK") {
    if (monitor.lastStatus !== "OK" && monitor.lastStatus !== "UNKNOWN") {
      await sendToChannels(monitor, { ...result, severity: "recovery", message: "Monitor recovered." }, configured);
    }
    return;
  }
  const fingerprint = alertFingerprint(result);
  if (!alerts.shouldSend(monitor.id, result.status, fingerprint)) return;
  await sendToChannels(monitor, result, configured);
};

export const testChannel = async (channel: NotificationChannel) => {
  await sendChannel(channel, { id: "test", name: "Test Monitor", host: "example.com", port: 443 } as Monitor, sampleResult());
};

export const buildPayload = (monitor: Monitor, result: CheckResult) => ({
  monitor_id: monitor.id,
  monitor_name: monitor.name,
  host: monitor.host,
  port: monitor.port,
  status: result.status.toLowerCase(),
  severity: result.severity,
  message: result.message,
  days_remaining: result.daysRemaining,
  valid_from: result.validFrom,
  valid_until: result.validUntil,
  issuer: result.issuer,
  fingerprint_sha256: result.fingerprintSha256,
  checked_at: result.checkedAt,
  url: `${env.baseUrl}/monitors/${monitor.id}`
});

const sendToChannels = async (monitor: Monitor, result: CheckResult, configured: NotificationChannel[]) => {
  const targets = configured.filter((channel) => channel.enabled && (!monitor.notificationChannelIds.length || monitor.notificationChannelIds.includes(channel.id)));
  await Promise.allSettled(targets.map(async (channel) => {
    await sendChannel(channel, monitor, result);
    alerts.record(monitor.id, channel.id, result.severity, result.status, alertFingerprint(result), result.message);
  }));
};

const sendChannel = async (channel: NotificationChannel, monitor: Monitor, result: CheckResult) => {
  if (channel.type === "email") return sendEmail(channel, monitor, result);
  if (channel.type === "pushover") return postForm(endpoint(channel, ["https://api", "pushover", "net/1/messages.json"]), {
    token: String(channel.config.apiToken ?? ""),
    user: String(channel.config.userKey ?? ""),
    message: result.message,
    title: `[CertWatch] ${monitor.name}`,
    priority: String(priorityFor(result.severity))
  });
  if (channel.type === "telegram") {
    const url = endpoint(channel, ["https://api", "telegram", `org/bot${String(channel.config.botToken ?? "")}/sendMessage`]);
    return postJson(url, { chat_id: channel.config.chatId, text: result.message });
  }
  return postJson(endpoint(channel), buildPayload(monitor, result));
};

const endpoint = (channel: NotificationChannel, fallbackParts?: string[]) => {
  const url = String(channel.config.url ?? "");
  if (url) return url;
  if (fallbackParts) return fallbackParts.join(".");
  throw new Error("Notification URL is required.");
};

const sendEmail = async (channel: NotificationChannel, monitor: Monitor, result: CheckResult) => {
  const transport = nodemailer.createTransport({
    host: String(channel.config.host ?? ""),
    port: Number(channel.config.port ?? 587),
    secure: Boolean(channel.config.secure),
    auth: channel.config.username ? { user: String(channel.config.username), pass: String(channel.config.password ?? "") } : undefined,
    requireTLS: Boolean(channel.config.starttls)
  });
  await transport.sendMail({
    from: String(channel.config.from ?? "certwatch@localhost"),
    to: String(channel.config.to ?? channel.config.username ?? ""),
    subject: `[CertWatch] ${subjectFor(result.severity)}: ${monitor.name}`,
    text: emailBody(monitor, result)
  });
};

const emailBody = (monitor: Monitor, result: CheckResult) => `The certificate check for ${monitor.name} needs attention.

Host: ${monitor.host}
Port: ${monitor.port}
Issuer: ${result.issuer ?? "unknown"}
Valid until: ${result.validUntil ?? "unknown"}
Days remaining: ${result.daysRemaining ?? "unknown"}
Status: ${result.status}

Problem:
${result.problems.join("\n") || result.message}

Recommendation:
Renew the certificate if it is close to expiry and verify the complete certificate chain afterwards.

CertWatch URL: ${env.baseUrl}/monitors/${monitor.id}
`;

const sampleResult = (): CheckResult => ({
  id: "test-result",
  monitorId: "test",
  status: "WARNING",
  severity: "warning",
  message: "CertWatch test notification.",
  checkedAt: new Date().toISOString(),
  durationMs: 0,
  daysRemaining: 30,
  validFrom: null,
  validUntil: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  commonName: "example.com",
  subjectAltNames: ["example.com"],
  issuer: "CertWatch",
  serialNumber: null,
  fingerprintSha256: "test",
  tlsVersion: "TLSv1.3",
  cipherSuite: null,
  chain: [],
  problems: [],
  rawError: null
});

const postJson = async (url: string, payload: unknown) => {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`Notification endpoint returned ${response.status}.`);
};

const postForm = async (url: string, values: Record<string, string>) => {
  const response = await fetch(url, { method: "POST", body: new URLSearchParams(values) });
  if (!response.ok) throw new Error(`Notification endpoint returned ${response.status}.`);
};

const priorityFor = (severity: Severity) => severity === "critical" ? 1 : severity === "recovery" ? 0 : -1;
const subjectFor = (severity: Severity) => severity === "recovery" ? "Recovered" : severity === "critical" ? "Critical certificate problem" : "Certificate warning";
