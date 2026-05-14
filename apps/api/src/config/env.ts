import path from "node:path";

const numberFromEnv = (key: string, fallback: number) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const boolFromEnv = (key: string, fallback: boolean) => {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: numberFromEnv("PORT", 8080),
  baseUrl: process.env.BASE_URL ?? "http://localhost:8080",
  databasePath: process.env.DATABASE_PATH ?? path.resolve("data/certwatch.sqlite"),
  sessionSecret: process.env.SESSION_SECRET ?? "dev-only-change-me",
  trustProxy: boolFromEnv("TRUST_PROXY", true),
  cookieSecure: boolFromEnv("COOKIE_SECURE", false),
  allowPrivateTargets: boolFromEnv("ALLOW_PRIVATE_TARGETS", false),
  checkConcurrency: numberFromEnv("CHECK_CONCURRENCY", 4),
  defaultIntervalSeconds: numberFromEnv("DEFAULT_INTERVAL_SECONDS", 3600),
  defaultWarningDays: numberFromEnv("DEFAULT_WARNING_DAYS", 30),
  defaultCriticalDays: numberFromEnv("DEFAULT_CRITICAL_DAYS", 7)
};
