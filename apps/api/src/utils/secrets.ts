import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

const prefix = "enc:v1:";
const key = createHash("sha256").update(env.sessionSecret).digest();

export const encryptSecret = (value: string) => {
  if (!value || value.startsWith(prefix) || value === "********") return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${prefix}${Buffer.concat([iv, tag, encrypted]).toString("base64url")}`;
};

export const decryptSecret = (value: unknown) => {
  const text = String(value ?? "");
  if (!text.startsWith(prefix)) return text;
  try {
    const payload = Buffer.from(text.slice(prefix.length), "base64url");
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
};

export const encryptConfigSecrets = (config: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(config).map(([configKey, value]) =>
    isSecretKey(configKey) && typeof value === "string" ? [configKey, encryptSecret(value)] : [configKey, value]
  ));

export const decryptConfigSecrets = (config: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(config).map(([configKey, value]) =>
    isSecretKey(configKey) && typeof value === "string" ? [configKey, decryptSecret(value)] : [configKey, value]
  ));

export const redactConfigSecrets = (config: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(config).map(([configKey, value]) =>
    isSecretKey(configKey) && value ? [configKey, "********"] : [configKey, value]
  ));

const isSecretKey = (configKey: string) => /password|token|secret|apiKey|accessToken/i.test(configKey);
