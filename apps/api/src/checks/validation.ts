import dns from "node:dns/promises";
import net from "node:net";
import { env } from "../config/env.js";

const hostnamePattern = /^(?=.{1,253}$)(?!-)[a-zA-Z0-9*.-]+(?<!-)$/;
const privateRanges = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^::1$/,
  /^fc/i,
  /^fd/i
];

export const validateHost = (host: string) => {
  const clean = host.trim().replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
  if (!clean || clean.length > 253) throw new Error("Host is required and must be shorter than 254 characters.");
  if (!hostnamePattern.test(clean) && net.isIP(clean) === 0) throw new Error("Host must be a valid hostname or IP address.");
  if (!env.allowPrivateTargets && isPrivateLiteral(clean)) throw new Error("Private targets are blocked by policy.");
  return clean.toLowerCase();
};

export const validatePort = (port: number) => {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Port must be between 1 and 65535.");
  return port;
};

export const assertPublicResolution = async (host: string) => {
  if (env.allowPrivateTargets || net.isIP(host)) return;
  const records = await dns.lookup(host, { all: true, verbatim: true });
  if (records.some((record) => isPrivateLiteral(record.address))) {
    throw new Error("Host resolves to a private address and private targets are disabled.");
  }
};

const isPrivateLiteral = (value: string) => privateRanges.some((range) => range.test(value));
