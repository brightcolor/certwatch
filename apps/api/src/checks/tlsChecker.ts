import tls from "node:tls";
import { X509Certificate } from "node:crypto";
import type { PeerCertificate } from "node:tls";
import type { CheckResult, Monitor } from "../types.js";
import { id } from "../utils/id.js";
import { nowIso } from "../utils/time.js";
import { classifyResult } from "./status.js";
import { assertPublicResolution } from "./validation.js";
import { prepareStartTls } from "./starttls.js";

export const runTlsCheck = async (monitor: Monitor, previousFingerprint?: string | null): Promise<CheckResult> => {
  const started = Date.now();
  try {
    await assertPublicResolution(monitor.host);
    const connection = await openTlsConnection(monitor);
    const cert = connection.socket.getPeerCertificate(true) as PeerCertificate;
    const x509 = cert.raw ? new X509Certificate(cert.raw) : null;
    const subjectAltNames = parseSan(x509?.subjectAltName ?? "");
    const parsedCommonName = parseDn(String(x509?.subject ?? cert.subject?.CN ?? "")).CN;
    const commonName = parsedCommonName || String(cert.subject?.CN ?? "") || null;
    const validFrom = x509 ? new Date(x509.validFrom) : cert.valid_from ? new Date(cert.valid_from) : undefined;
    const validUntil = x509 ? new Date(x509.validTo) : cert.valid_to ? new Date(cert.valid_to) : undefined;
    const fingerprint = x509?.fingerprint256.replaceAll(":", "").toLowerCase() ?? cert.fingerprint256?.replaceAll(":", "").toLowerCase();
    const selfSigned = Boolean(x509 && x509.subject === x509.issuer);
    const hostnameMatch = matchHostname(monitor.sniHost || monitor.host, commonName, subjectAltNames);
    const chain = buildChain(cert);
    const classified = classifyResult(monitor, {
      validUntil,
      validFrom,
      hostnameMatch,
      trusted: connection.authorized,
      selfSigned,
      handshakeOk: true,
      reachable: true,
      tlsVersion: connection.socket.getProtocol() ?? undefined,
      previousFingerprint,
      fingerprint,
      chainProblems: chain.length <= 1 ? ["Certificate chain contains no intermediate certificates."] : []
    });

    const result = makeResult(monitor, classified.status, classified.severity, started, classified.problems, {
      daysRemaining: classified.daysRemaining,
      validFrom: validFrom?.toISOString(),
      validUntil: validUntil?.toISOString(),
      commonName,
      subjectAltNames,
      issuer: parseDn(x509?.issuer ?? "").O ?? x509?.issuer ?? null,
      serialNumber: x509?.serialNumber ?? cert.serialNumber ?? null,
      fingerprintSha256: fingerprint,
      tlsVersion: connection.socket.getProtocol(),
      cipherSuite: connection.socket.getCipher()?.name,
      chain
    });
    connection.socket.destroy();
    return result;
  } catch (error) {
    return makeResult(monitor, "DOWN", "critical", started, [error instanceof Error ? error.message : "Check failed."], {
      rawError: error instanceof Error ? error.message : String(error)
    });
  }
};

const openTlsConnection = (monitor: Monitor) =>
  new Promise<{ socket: tls.TLSSocket; authorized: boolean }>(async (resolve, reject) => {
    const timeoutMs = monitor.timeoutSeconds * 1000;
    const servername = monitor.sniEnabled ? monitor.sniHost || monitor.host : undefined;
    const options = { host: monitor.host, port: monitor.port, servername, rejectUnauthorized: false, timeout: timeoutMs };
    let rawSocket: import("node:net").Socket | undefined;
    try {
      if (monitor.type.endsWith("_starttls")) {
        const mode = monitor.type.split("_")[0] as "smtp" | "imap" | "pop3";
        rawSocket = (await prepareStartTls(monitor.host, monitor.port, mode, timeoutMs)).socket;
      }
      const socket = rawSocket ? tls.connect({ ...options, socket: rawSocket }) : tls.connect(options);
      socket.once("secureConnect", () => resolve({ socket, authorized: socket.authorized }));
      socket.once("error", reject);
      socket.once("timeout", () => reject(new Error("TLS check timed out.")));
    } catch (error) {
      reject(error);
    }
  });

const makeResult = (
  monitor: Monitor,
  status: CheckResult["status"],
  severity: CheckResult["severity"],
  started: number,
  problems: string[],
  data: Partial<CheckResult> = {}
): CheckResult => ({
  id: id(),
  monitorId: monitor.id,
  status,
  severity,
  message: problems.length ? problems[0] : "Certificate and TLS configuration look healthy.",
  checkedAt: nowIso(),
  durationMs: Date.now() - started,
  daysRemaining: data.daysRemaining ?? null,
  validFrom: data.validFrom ?? null,
  validUntil: data.validUntil ?? null,
  commonName: data.commonName ?? null,
  subjectAltNames: data.subjectAltNames ?? [],
  issuer: data.issuer ?? null,
  serialNumber: data.serialNumber ?? null,
  fingerprintSha256: data.fingerprintSha256 ?? null,
  tlsVersion: data.tlsVersion ?? null,
  cipherSuite: data.cipherSuite ?? null,
  chain: data.chain ?? [],
  problems,
  rawError: data.rawError ?? null
});

const parseDn = (dn: string) =>
  Object.fromEntries(dn.split(/\n|, /).map((part) => {
    const [key, ...value] = part.split("=");
    return [key?.trim(), value.join("=").trim()];
  }));

const parseSan = (value: string) =>
  value.split(/,\s*/).map((entry) => entry.replace(/^DNS:/, "").trim()).filter(Boolean);

const matchHostname = (host: string, commonName: string | null, sans: string[]) => {
  const names = sans.length ? sans : commonName ? [commonName] : [];
  return names.some((name) => name === host || (name.startsWith("*.") && host.endsWith(name.slice(1))));
};

const buildChain = (cert: PeerCertificate) => {
  const items = [];
  let current: PeerCertificate | undefined = cert;
  const seen = new Set<string>();
  while (current && current.raw && !seen.has(current.raw.toString("base64"))) {
    seen.add(current.raw.toString("base64"));
    const x509 = new X509Certificate(current.raw);
    items.push({
      subject: x509.subject,
      issuer: x509.issuer,
      validFrom: new Date(x509.validFrom).toISOString(),
      validUntil: new Date(x509.validTo).toISOString(),
      fingerprintSha256: x509.fingerprint256.replaceAll(":", "").toLowerCase(),
      serialNumber: x509.serialNumber
    });
    const withIssuer = current as PeerCertificate & { issuerCertificate?: PeerCertificate };
    const issuerCertificate: PeerCertificate | undefined = withIssuer.issuerCertificate;
    current = issuerCertificate && issuerCertificate !== current ? issuerCertificate : undefined;
  }
  return items;
};
