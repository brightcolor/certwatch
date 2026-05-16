import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import type { CheckResult, Monitor, NotificationChannel, NotificationRoute, Severity, SmtpSettings } from "../types.js";
import { alerts, appSettings } from "../storage/repositories.js";
import { alertFingerprint } from "../checks/status.js";

export const dispatchAlerts = async (monitor: Monitor, result: CheckResult, configured: NotificationChannel[]) => {
  const settings = appSettings.alerting();
  if (result.severity === "info" && result.status === "OK") {
    if (settings.recoveryEnabled && monitor.lastStatus !== "OK" && monitor.lastStatus !== "UNKNOWN") {
      await sendToChannels(monitor, { ...result, severity: "recovery", message: "Monitor recovered." }, configured);
    }
    return;
  }
  if (isQuietHour(settings.quietStart, settings.quietEnd) && settings.quietHoursEnabled && (settings.quietSuppressCritical || result.severity !== "critical")) {
    return;
  }
  const fingerprint = alertFingerprint(result);
  if (!alerts.shouldSend(monitor.id, result.status, fingerprint, settings.resendAfterHours)) return;
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
  const selected = selectedChannelIds(monitor, result, appSettings.notificationRoutes(), configured.map((channel) => channel.id));
  const targets = configured.filter((channel) => channel.enabled && selected.has(channel.id));
  await Promise.allSettled(targets.map(async (channel) => {
    await sendChannel(channel, monitor, result, selected.get(channel.id) ?? "");
    alerts.record(monitor.id, channel.id, result.severity, result.status, alertFingerprint(result), result.message);
  }));
};

const selectedChannelIds = (monitor: Monitor, result: CheckResult, routes: NotificationRoute[], fallback: string[]) => {
  const explicit = new Map<string, string>();
  for (const channelId of monitor.notificationChannelIds) explicit.set(channelId, monitor.notificationRecipients[channelId] ?? "");
  for (const route of routes) {
    if (!route.enabled) continue;
    const tagMatch = !route.tags.length || route.tags.some((tag) => monitor.tags.includes(tag));
    const severityMatch = !route.severities.length || route.severities.includes(result.severity);
    if (tagMatch && severityMatch) route.channelIds.forEach((channelId) => explicit.set(channelId, route.recipients[channelId] ?? explicit.get(channelId) ?? ""));
  }
  if (!explicit.size) return new Map(fallback.map((channelId) => [channelId, ""]));
  return explicit;
};

const sendChannel = async (channel: NotificationChannel, monitor: Monitor, result: CheckResult, recipient = "") => {
  if (channel.type === "email") return sendEmail(channel, monitor, result, recipient);
  if (channel.type === "pushover") return postForm(endpoint(channel, ["https://api", "pushover", "net/1/messages.json"]), {
    token: String(channel.config.apiToken ?? ""),
    user: recipient || String(channel.config.userKey ?? ""),
    message: result.message,
    title: `[CertWatch] ${monitor.name}`,
    priority: String(priorityFor(result.severity))
  });
  if (channel.type === "telegram") {
    const url = endpoint(channel, ["https://api", "telegram", `org/bot${String(channel.config.botToken ?? "")}/sendMessage`]);
    return postJson(url, { chat_id: recipient || channel.config.chatId, text: result.message });
  }
  if (channel.type === "matrix") return postJson(matrixEndpoint(channel, recipient), { msgtype: "m.text", body: result.message });
  if (channel.type === "pagerduty") return postJson(endpoint(channel, ["https://events", "pagerduty", "com/v2/enqueue"]), pagerDutyPayload(channel, monitor, result));
  if (channel.type === "opsgenie") return postJson(endpoint(channel, ["https://api", "opsgenie", "com/v2/alerts"]), opsgeniePayload(monitor, result), { Authorization: `GenieKey ${String(channel.config.apiKey ?? "")}` });
  return postJson(recipient || endpoint(channel), providerPayload(channel, monitor, result));
};

const endpoint = (channel: NotificationChannel, fallbackParts?: string[]) => {
  const url = String(channel.config.url ?? "");
  if (url) return url;
  if (fallbackParts) return fallbackParts.join(".");
  throw new Error("Notification URL is required.");
};

const sendEmail = async (channel: NotificationChannel, monitor: Monitor, result: CheckResult, recipient = "") => {
  const globalSmtp = appSettings.smtp();
  const smtp = mergeSmtp(globalSmtp, channel.config);
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.username ? { user: smtp.username, pass: smtp.password } : undefined,
    requireTLS: smtp.starttls
  });
  await transport.sendMail({
    from: String(channel.config.from ?? smtp.from ?? "certwatch@localhost"),
    to: recipient || String(channel.config.to ?? channel.config.username ?? ""),
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

const postJson = async (url: string, payload: unknown, headers: Record<string, string> = {}) => {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`Notification endpoint returned ${response.status}.`);
};

const postForm = async (url: string, values: Record<string, string>) => {
  const response = await fetch(url, { method: "POST", body: new URLSearchParams(values) });
  if (!response.ok) throw new Error(`Notification endpoint returned ${response.status}.`);
};

const mergeSmtp = (globalSmtp: SmtpSettings, config: Record<string, unknown>): SmtpSettings => ({
  host: String(config.host || globalSmtp.host),
  port: Number(config.port || globalSmtp.port || 587),
  username: String(config.username || globalSmtp.username || ""),
  password: String(config.password || globalSmtp.password || ""),
  from: String(config.from || globalSmtp.from || ""),
  secure: Boolean(config.secure ?? globalSmtp.secure),
  starttls: Boolean(config.starttls ?? globalSmtp.starttls)
});

const providerPayload = (channel: NotificationChannel, monitor: Monitor, result: CheckResult) => {
  const payload = buildPayload(monitor, result);
  if (channel.type === "discord") return { content: `**${monitor.name}**: ${result.message}`, embeds: [{ title: monitor.name, description: result.problems.join("\n") || result.message, color: result.severity === "critical" ? 15_585_873 : 13_801_762 }] };
  if (channel.type === "slack" || channel.type === "mattermost") return { text: `*${monitor.name}* ${result.status}: ${result.message}`, attachments: [{ color: result.severity === "critical" ? "danger" : "warning", text: result.problems.join("\n") }] };
  if (channel.type === "teams") return { title: `CertWatch ${result.status}`, text: `${monitor.name}: ${result.message}` };
  if (channel.type === "ntfy") return { topic: channel.config.topic, title: `CertWatch ${result.status}`, message: `${monitor.name}: ${result.message}`, priority: result.severity === "critical" ? 5 : 3, tags: ["warning"] };
  if (channel.type === "gotify") return { title: `CertWatch ${result.status}`, message: `${monitor.name}: ${result.message}`, priority: result.severity === "critical" ? 8 : 4 };
  return payload;
};

const matrixEndpoint = (channel: NotificationChannel, recipient = "") => {
  const baseUrl = String(channel.config.baseUrl ?? "").replace(/\/$/, "");
  const roomId = encodeURIComponent(recipient || String(channel.config.roomId ?? ""));
  const token = encodeURIComponent(String(channel.config.accessToken ?? ""));
  if (!baseUrl || !roomId || !token) return endpoint(channel);
  return `${baseUrl}/_matrix/client/v3/rooms/${roomId}/send/m.room.message?access_token=${token}`;
};

const pagerDutyPayload = (channel: NotificationChannel, monitor: Monitor, result: CheckResult) => ({
  routing_key: String(channel.config.integrationKey ?? ""),
  event_action: result.severity === "recovery" ? "resolve" : "trigger",
  dedup_key: monitor.id,
  payload: {
    summary: `${monitor.name}: ${result.message}`,
    severity: result.severity === "critical" ? "critical" : "warning",
    source: monitor.host,
    custom_details: buildPayload(monitor, result)
  }
});

const opsgeniePayload = (monitor: Monitor, result: CheckResult) => ({
  message: `${monitor.name}: ${result.message}`,
  alias: monitor.id,
  priority: result.severity === "critical" ? "P1" : "P3",
  details: buildPayload(monitor, result)
});

const isQuietHour = (start: string, end: string, date = new Date()) => {
  const now = date.getHours() * 60 + date.getMinutes();
  const startMinutes = parseClock(start);
  const endMinutes = parseClock(end);
  if (startMinutes === endMinutes) return false;
  return startMinutes < endMinutes ? now >= startMinutes && now < endMinutes : now >= startMinutes || now < endMinutes;
};

const parseClock = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
};

const priorityFor = (severity: Severity) => severity === "critical" ? 1 : severity === "recovery" ? 0 : -1;
const subjectFor = (severity: Severity) => severity === "recovery" ? "Recovered" : severity === "critical" ? "Critical certificate problem" : "Certificate warning";
