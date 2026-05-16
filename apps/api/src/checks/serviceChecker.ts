import dns from "node:dns/promises";
import net from "node:net";
import type { CheckResult, Monitor } from "../types.js";
import { id } from "../utils/id.js";
import { nowIso } from "../utils/time.js";
import { assertPublicResolution } from "./validation.js";

export const isServiceMonitor = (type: string) => ["http", "tcp", "dns", "http_login", "ssh", "ftp", "smtp", "imap", "pop3"].includes(type);

export const runServiceCheck = async (monitor: Monitor): Promise<CheckResult> => {
  const started = Date.now();
  try {
    if (monitor.type === "tcp") return ok(monitor, started, await checkTcp(monitor));
    if (monitor.type === "dns") return ok(monitor, started, await checkDns(monitor));
    if (monitor.type === "http" || monitor.type === "http_login") return ok(monitor, started, await checkHttp(monitor));
    if (["ssh", "ftp", "smtp", "imap", "pop3"].includes(monitor.type)) return ok(monitor, started, await checkBannerProtocol(monitor));
    throw new Error(`Unsupported service monitor type: ${monitor.type}`);
  } catch (error) {
    return result(monitor, "DOWN", "critical", started, error instanceof Error ? error.message : String(error));
  }
};

const checkTcp = async (monitor: Monitor) => {
  await assertPublicResolution(monitor.host);
  await new Promise<void>((resolve, reject) => {
    const socket = net.connect({ host: monitor.host, port: monitor.port });
    socket.setTimeout(monitor.timeoutSeconds * 1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve();
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("TCP connection timed out."));
    });
    socket.once("error", reject);
  });
  return `TCP port ${monitor.port} is reachable.`;
};

const checkDns = async (monitor: Monitor) => {
  const recordType = String(monitor.config.recordType ?? "A").toUpperCase();
  const expected = String(monitor.config.expectedValue ?? "");
  const records = await dns.resolve(monitor.host, recordType as any);
  const flat = records.flat().map(String);
  if (expected && !flat.some((record) => record.includes(expected))) throw new Error(`DNS ${recordType} result did not contain expected value.`);
  return `DNS ${recordType} resolved ${flat.length} record(s).`;
};

const checkBannerProtocol = async (monitor: Monitor) => {
  await assertPublicResolution(monitor.host);
  const banner = await readBanner(monitor);
  const expected = expectedBanner(monitor.type);
  if (!expected.test(banner)) throw new Error(`${monitor.type.toUpperCase()} banner was unexpected: ${banner || "empty response"}.`);
  return `${monitor.type.toUpperCase()} service responded: ${banner.slice(0, 120)}`;
};

const readBanner = (monitor: Monitor) =>
  new Promise<string>((resolve, reject) => {
    const socket = net.connect({ host: monitor.host, port: monitor.port });
    let buffer = "";
    const finish = (value: string) => {
      socket.destroy();
      resolve(value.trim());
    };
    socket.setTimeout(monitor.timeoutSeconds * 1000);
    socket.once("connect", () => {
      if (monitor.type === "smtp") socket.write("EHLO certwatch.local\r\n");
      if (monitor.type === "imap") socket.write("a001 CAPABILITY\r\n");
      if (monitor.type === "pop3") socket.write("CAPA\r\n");
    });
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      if (bannerComplete(monitor.type, buffer)) finish(buffer);
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error(`${monitor.type.toUpperCase()} check timed out.`));
    });
    socket.once("error", reject);
    socket.once("end", () => finish(buffer));
  });

const expectedBanner = (type: string) => ({
  ssh: /^SSH-/i,
  ftp: /^220/i,
  smtp: /^220|250[\s-]/im,
  imap: /^\* OK|CAPABILITY/im,
  pop3: /^\+OK|^CAPA/im
}[type] ?? /./);

const bannerComplete = (type: string, buffer: string) => {
  if (type === "ssh" || type === "ftp") return /\r?\n/.test(buffer);
  if (type === "smtp") return /^250 /m.test(buffer) || /^220/m.test(buffer);
  if (type === "imap") return /^a001 (OK|NO|BAD)/im.test(buffer) || /^\* OK/im.test(buffer);
  if (type === "pop3") return /\r?\n\.\r?\n/.test(buffer) || /^\+OK/im.test(buffer);
  return /\r?\n/.test(buffer);
};

const checkHttp = async (monitor: Monitor) => {
  await assertPublicResolution(monitor.host);
  const url = buildUrl(monitor);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), monitor.timeoutSeconds * 1000);
  try {
    const response = monitor.type === "http_login" ? await loginRequest(url, monitor, controller.signal) : await fetch(url, { signal: controller.signal, redirect: "manual" });
    const expectedStatus = Number(monitor.config.expectedStatus ?? 200);
    if (response.status !== expectedStatus) throw new Error(`HTTP status ${response.status}, expected ${expectedStatus}.`);
    const expectedText = String(monitor.config.expectedText ?? "");
    if (expectedText) {
      const body = await response.text();
      if (!body.includes(expectedText)) throw new Error("HTTP response did not contain expected text.");
    }
    return `${url} returned HTTP ${response.status}.`;
  } finally {
    clearTimeout(timeout);
  }
};

const loginRequest = (url: string, monitor: Monitor, signal: AbortSignal) => {
  const username = String(monitor.config.username ?? "");
  const password = String(monitor.config.password ?? "");
  if (monitor.config.authType === "basic") {
    return fetch(url, { signal, headers: { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}` } });
  }
  const body = new URLSearchParams({
    [String(monitor.config.usernameField ?? "username")]: username,
    [String(monitor.config.passwordField ?? "password")]: password
  });
  return fetch(url, { method: "POST", signal, body, headers: { "content-type": "application/x-www-form-urlencoded" }, redirect: "manual" });
};

const buildUrl = (monitor: Monitor) => {
  const scheme = String(monitor.config.scheme ?? (monitor.port === 443 ? "https" : "http"));
  const path = String(monitor.config.path ?? "/");
  return `${scheme}://${monitor.host}:${monitor.port}${path.startsWith("/") ? path : `/${path}`}`;
};

const ok = (monitor: Monitor, started: number, message: string) => result(monitor, "OK", "info", started, message);

const result = (monitor: Monitor, status: CheckResult["status"], severity: CheckResult["severity"], started: number, message: string): CheckResult => ({
  id: id(),
  monitorId: monitor.id,
  status,
  severity,
  message,
  checkedAt: nowIso(),
  durationMs: Date.now() - started,
  daysRemaining: null,
  validFrom: null,
  validUntil: null,
  commonName: null,
  subjectAltNames: [],
  issuer: null,
  serialNumber: null,
  fingerprintSha256: null,
  tlsVersion: null,
  cipherSuite: null,
  chain: [],
  problems: status === "OK" ? [] : [message],
  rawError: status === "OK" ? null : message
});
