import tls from "node:tls";
import type { Monitor } from "../types.js";

type LoginProtocol = "smtp" | "imap" | "pop3" | "ftp";

const loginProtocols: Record<string, LoginProtocol> = {
  smtp_starttls: "smtp",
  smtps: "smtp",
  imap_starttls: "imap",
  imaps: "imap",
  pop3_starttls: "pop3",
  pop3s: "pop3",
  ftp_starttls: "ftp",
  ftps: "ftp"
};

export const tlsLoginProtocol = (type: string): LoginProtocol | null => loginProtocols[type] ?? null;

export const tlsLoginEnabled = (monitor: Monitor) =>
  Boolean(monitor.config.loginEnabled) && Boolean(tlsLoginProtocol(monitor.type));

export const tlsLoginSuccessMessage = (monitor: Monitor) => {
  const protocol = tlsLoginProtocol(monitor.type)?.toUpperCase() ?? "service";
  return `Certificate, TLS configuration, and ${protocol} login look healthy.`;
};

export const checkTlsLogin = async (socket: tls.TLSSocket, monitor: Monitor) => {
  const protocol = tlsLoginProtocol(monitor.type);
  if (!protocol) return;
  const reader = new SecureLineReader(socket, protocol);
  try {
    if (protocol === "smtp") await smtpLogin(reader, monitor, monitor.type === "smtps");
    if (protocol === "imap") await imapLogin(reader, monitor, monitor.type === "imaps");
    if (protocol === "pop3") await pop3Login(reader, monitor, monitor.type === "pop3s");
    if (protocol === "ftp") await ftpLogin(reader, monitor, monitor.type === "ftps");
  } finally {
    reader.detach();
  }
};

class SecureLineReader {
  private buffer = "";
  private lines: string[] = [];
  private waiters: Array<() => void> = [];
  private error: Error | null = null;

  constructor(private readonly socket: tls.TLSSocket, private readonly protocol: string) {
    socket.on("data", this.onData);
    socket.once("error", this.onError);
    socket.once("timeout", this.onTimeout);
    socket.once("end", this.onEnd);
  }

  write(line: string) {
    this.socket.write(`${line}\r\n`);
  }

  detach() {
    this.socket.off("data", this.onData);
    this.socket.off("error", this.onError);
    this.socket.off("timeout", this.onTimeout);
    this.socket.off("end", this.onEnd);
  }

  async readUntil(done: (lines: string[]) => boolean) {
    const seen: string[] = [];
    while (true) {
      while (this.lines.length) {
        const line = this.lines.shift()!;
        seen.push(line);
        if (done(seen)) return seen;
      }
      if (this.error) throw this.error;
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
  }

  private wake() {
    const waiters = this.waiters.splice(0);
    for (const waiter of waiters) waiter();
  }

  private onData = (chunk: Buffer) => {
    this.buffer += chunk.toString("utf8");
    const parts = this.buffer.split(/\r?\n/);
    this.buffer = parts.pop() ?? "";
    this.lines.push(...parts.filter(Boolean));
    this.wake();
  };

  private onError = (error: Error) => {
    this.error = error;
    this.wake();
  };

  private onTimeout = () => {
    this.error = new Error(`${this.protocol.toUpperCase()} TLS login timed out.`);
    this.wake();
  };

  private onEnd = () => {
    this.error = new Error(`${this.protocol.toUpperCase()} TLS connection closed during login.`);
    this.wake();
  };
}

const smtpLogin = async (reader: SecureLineReader, monitor: Monitor, waitGreeting: boolean) => {
  if (waitGreeting) await reader.readUntil((lines) => smtpFinal(lines, 220));
  reader.write("EHLO sender.report.local");
  await reader.readUntil((lines) => smtpFinal(lines, 250));
  reader.write("AUTH LOGIN");
  const auth = await reader.readUntil((lines) => smtpFinal(lines, 334) || smtpFinal(lines, 503));
  if (auth.some((line) => /^503\b/.test(line))) return;
  reader.write(Buffer.from(credential(monitor, "username")).toString("base64"));
  await reader.readUntil((lines) => smtpFinal(lines, 334));
  reader.write(Buffer.from(credential(monitor, "password")).toString("base64"));
  const done = await reader.readUntil((lines) => smtpFinal(lines, 235) || smtpFinal(lines, 535));
  if (!done.some((line) => /^235\b/.test(line))) throw new Error("SMTP TLS login failed.");
};

const imapLogin = async (reader: SecureLineReader, monitor: Monitor, waitGreeting: boolean) => {
  if (waitGreeting) await reader.readUntil((lines) => lines.some((line) => /^\* (OK|PREAUTH)/i.test(line)));
  reader.write(`cw003 LOGIN "${escapeImap(credential(monitor, "username"))}" "${escapeImap(credential(monitor, "password"))}"`);
  const response = await reader.readUntil((lines) => lines.some((line) => /^cw003 (OK|NO|BAD)\b/i.test(line)));
  if (!response.some((line) => /^cw003 OK\b/i.test(line))) throw new Error("IMAP TLS login failed.");
};

const pop3Login = async (reader: SecureLineReader, monitor: Monitor, waitGreeting: boolean) => {
  if (waitGreeting) await reader.readUntil((lines) => lines.some((line) => /^\+OK/i.test(line)));
  reader.write(`USER ${credential(monitor, "username")}`);
  const user = await reader.readUntil((lines) => lines.some((line) => /^(\+OK|-ERR)/i.test(line)));
  if (!user.some((line) => /^\+OK/i.test(line))) throw new Error("POP3 TLS username was rejected.");
  reader.write(`PASS ${credential(monitor, "password")}`);
  const pass = await reader.readUntil((lines) => lines.some((line) => /^(\+OK|-ERR)/i.test(line)));
  if (!pass.some((line) => /^\+OK/i.test(line))) throw new Error("POP3 TLS login failed.");
};

const ftpLogin = async (reader: SecureLineReader, monitor: Monitor, waitGreeting: boolean) => {
  if (waitGreeting) await reader.readUntil((lines) => lines.some((line) => /^220\b/.test(line)));
  await optionalFtpCommand(reader, "PBSZ 0");
  await optionalFtpCommand(reader, "PROT P");
  reader.write(`USER ${credential(monitor, "username")}`);
  const userResponse = await reader.readUntil((lines) => lines.some((line) => /^(\d{3})\b/.test(line)));
  if (userResponse.some((line) => /^230\b/.test(line))) return;
  if (!userResponse.some((line) => /^331\b/.test(line))) throw new Error("FTP TLS username was rejected.");
  reader.write(`PASS ${credential(monitor, "password")}`);
  const passResponse = await reader.readUntil((lines) => lines.some((line) => /^(\d{3})\b/.test(line)));
  if (!passResponse.some((line) => /^230\b/.test(line))) throw new Error("FTP TLS login failed.");
};

const optionalFtpCommand = async (reader: SecureLineReader, command: string) => {
  reader.write(command);
  await reader.readUntil((lines) => lines.some((line) => /^(\d{3})\b/.test(line)));
};

const smtpFinal = (lines: string[], code: number) => {
  const prefix = String(code);
  return lines.some((line) => line.startsWith(`${prefix} `)) || (lines.length === 1 && lines[0].startsWith(prefix) && !lines[0].startsWith(`${prefix}-`));
};

const credential = (monitor: Monitor, key: "username" | "password") => String(monitor.config[key] ?? "");
const escapeImap = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
