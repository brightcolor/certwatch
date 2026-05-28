import fs from "node:fs";
import path from "node:path";
import initSqlJs, { Database as SqlJsDatabase, SqlValue } from "sql.js";
import { env } from "../config/env.js";
import type { ApiToken, CheckResult, Incident, Monitor, NotificationChannel, NotificationDelivery, StatusSubscription, User } from "../types.js";
import { decryptConfigSecrets } from "../utils/secrets.js";

fs.mkdirSync(path.dirname(env.databasePath), { recursive: true });
const SQL = await initSqlJs();
const initial = fs.existsSync(env.databasePath) ? fs.readFileSync(env.databasePath) : undefined;
const sqlite = new SQL.Database(initial);

const persist = () => fs.writeFileSync(env.databasePath, Buffer.from(sqlite.export()));

export const db = {
  exec(sql: string) {
    sqlite.exec(sql);
    persist();
  },
  prepare(sql: string) {
    return new StatementWrapper(sqlite, sql);
  }
};

class StatementWrapper {
  constructor(private readonly database: SqlJsDatabase, private readonly sql: string) {}

  run(...params: unknown[]) {
    const statement = this.database.prepare(this.sql);
    try {
      statement.run(bindParams(params));
      persist();
    } finally {
      statement.free();
    }
  }

  get(...params: unknown[]) {
    const statement = this.database.prepare(this.sql);
    try {
      statement.bind(bindParams(params));
      if (!statement.step()) return undefined;
      return statement.getAsObject();
    } finally {
      statement.free();
    }
  }

  all(...params: unknown[]) {
    const statement = this.database.prepare(this.sql);
    const rows = [];
    try {
      statement.bind(bindParams(params));
      while (statement.step()) rows.push(statement.getAsObject());
      return rows;
    } finally {
      statement.free();
    }
  }
}

const bindParams = (params: unknown[]) => {
  if (params.length === 1 && isPlainObject(params[0])) {
    return Object.fromEntries(Object.entries(params[0]).flatMap(([key, value]) => [
      [`@${key}`, normalizeValue(value)],
      [`:${key}`, normalizeValue(value)],
      [`$${key}`, normalizeValue(value)]
    ]));
  }
  return params.map(normalizeValue);
};

const normalizeValue = (value: unknown): SqlValue => {
  if (value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" || typeof value === "number" || value === null) return value;
  return JSON.stringify(value);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export const migrate = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csrf_token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS api_tokens (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      scopes_json TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_used_at TEXT
    );
    CREATE TABLE IF NOT EXISTS monitors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      type TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      interval_seconds INTEGER NOT NULL,
      timeout_seconds INTEGER NOT NULL,
      warning_days INTEGER NOT NULL,
      critical_days INTEGER NOT NULL,
      grace_period_seconds INTEGER NOT NULL DEFAULT 0,
      sni_enabled INTEGER NOT NULL,
      sni_host TEXT,
      validate_certificate INTEGER NOT NULL,
      allow_self_signed INTEGER NOT NULL,
      tags_json TEXT NOT NULL,
      notes TEXT,
      owner TEXT,
      channel_ids_json TEXT NOT NULL,
      notification_recipients_json TEXT NOT NULL DEFAULT '{}',
      config_json TEXT NOT NULL DEFAULT '{}',
      maintenance_windows TEXT,
      last_status TEXT NOT NULL,
      next_check_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS check_results (
      id TEXT PRIMARY KEY,
      monitor_id TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      checked_at TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      days_remaining INTEGER,
      valid_from TEXT,
      valid_until TEXT,
      common_name TEXT,
      subject_alt_names_json TEXT NOT NULL,
      issuer TEXT,
      serial_number TEXT,
      fingerprint_sha256 TEXT,
      tls_version TEXT,
      cipher_suite TEXT,
      tls_grade TEXT,
      tls_score INTEGER,
      tls_supported_versions_json TEXT NOT NULL DEFAULT '[]',
      ssl_labs_grade TEXT,
      ssl_labs_score INTEGER,
      ssl_labs_status TEXT,
      ssl_labs_url TEXT,
      ssl_labs_checked_at TEXT,
      ssl_labs_findings_json TEXT NOT NULL DEFAULT '[]',
      dns_json TEXT,
      flapping INTEGER NOT NULL DEFAULT 0,
      chain_json TEXT NOT NULL,
      problems_json TEXT NOT NULL,
      raw_error TEXT
    );
    CREATE TABLE IF NOT EXISTS notification_channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      enabled INTEGER NOT NULL,
      config_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS alert_history (
      id TEXT PRIMARY KEY,
      monitor_id TEXT NOT NULL,
      channel_id TEXT,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      message TEXT NOT NULL,
      sent_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notification_deliveries (
      id TEXT PRIMARY KEY,
      monitor_id TEXT NOT NULL,
      channel_id TEXT,
      channel_name TEXT NOT NULL,
      provider TEXT NOT NULL,
      target TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      delivery_status TEXT NOT NULL,
      message TEXT NOT NULL,
      error TEXT,
      sent_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      monitor_id TEXT NOT NULL,
      status TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      started_at TEXT NOT NULL,
      resolved_at TEXT,
      acknowledged_at TEXT,
      acknowledged_by TEXT,
      assignee TEXT,
      notes_json TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS status_subscriptions (
      id TEXT PRIMARY KEY,
      tags_json TEXT NOT NULL,
      type TEXT NOT NULL,
      target TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  try {
    db.exec("ALTER TABLE monitors ADD COLUMN notification_recipients_json TEXT NOT NULL DEFAULT '{}';");
  } catch {
    // Existing databases already have the column.
  }
  try {
    db.exec("ALTER TABLE monitors ADD COLUMN config_json TEXT NOT NULL DEFAULT '{}';");
  } catch {
    // Existing databases already have the column.
  }
  try {
    db.exec("ALTER TABLE monitors ADD COLUMN grace_period_seconds INTEGER NOT NULL DEFAULT 0;");
  } catch {
    // Existing databases already have the column.
  }
  for (const sql of [
    "ALTER TABLE check_results ADD COLUMN tls_grade TEXT;",
    "ALTER TABLE check_results ADD COLUMN tls_score INTEGER;",
    "ALTER TABLE check_results ADD COLUMN tls_supported_versions_json TEXT NOT NULL DEFAULT '[]';",
    "ALTER TABLE check_results ADD COLUMN ssl_labs_grade TEXT;",
    "ALTER TABLE check_results ADD COLUMN ssl_labs_score INTEGER;",
    "ALTER TABLE check_results ADD COLUMN ssl_labs_status TEXT;",
    "ALTER TABLE check_results ADD COLUMN ssl_labs_url TEXT;",
    "ALTER TABLE check_results ADD COLUMN ssl_labs_checked_at TEXT;",
    "ALTER TABLE check_results ADD COLUMN ssl_labs_findings_json TEXT NOT NULL DEFAULT '[]';",
    "ALTER TABLE check_results ADD COLUMN dns_json TEXT;",
    "ALTER TABLE check_results ADD COLUMN flapping INTEGER NOT NULL DEFAULT 0;"
  ]) {
    try {
      db.exec(sql);
    } catch {
      // Existing databases already have the column.
    }
  }
  for (const sql of [
    "ALTER TABLE incidents ADD COLUMN acknowledged_at TEXT;",
    "ALTER TABLE incidents ADD COLUMN acknowledged_by TEXT;",
    "ALTER TABLE incidents ADD COLUMN assignee TEXT;",
    "ALTER TABLE incidents ADD COLUMN notes_json TEXT NOT NULL DEFAULT '[]';"
  ]) {
    try {
      db.exec(sql);
    } catch {
      // Existing databases already have the column.
    }
  }
};

const parse = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const rowToMonitor = (row: any): Monitor => ({
  id: row.id,
  name: row.name,
  host: row.host,
  port: row.port,
  type: row.type,
  enabled: Boolean(row.enabled),
  intervalSeconds: row.interval_seconds,
  timeoutSeconds: row.timeout_seconds,
  warningDays: row.warning_days,
  criticalDays: row.critical_days,
  gracePeriodSeconds: row.grace_period_seconds ?? 0,
  sniEnabled: Boolean(row.sni_enabled),
  sniHost: row.sni_host,
  validateCertificate: Boolean(row.validate_certificate),
  allowSelfSigned: Boolean(row.allow_self_signed),
  tags: parse<string[]>(row.tags_json, []),
  notes: row.notes,
  owner: row.owner,
  notificationChannelIds: parse<string[]>(row.channel_ids_json, []),
  notificationRecipients: parse<Record<string, string>>(row.notification_recipients_json, {}),
  config: decryptConfigSecrets(parse<Record<string, unknown>>(row.config_json, {})),
  maintenanceWindows: row.maintenance_windows,
  lastStatus: row.last_status,
  nextCheckAt: row.next_check_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const rowToResult = (row: any): CheckResult => ({
  id: row.id,
  monitorId: row.monitor_id,
  status: row.status,
  severity: row.severity,
  message: row.message,
  checkedAt: row.checked_at,
  durationMs: row.duration_ms,
  daysRemaining: row.days_remaining,
  validFrom: row.valid_from,
  validUntil: row.valid_until,
  commonName: row.common_name,
  subjectAltNames: parse<string[]>(row.subject_alt_names_json, []),
  issuer: row.issuer,
  serialNumber: row.serial_number,
  fingerprintSha256: row.fingerprint_sha256,
  tlsVersion: row.tls_version,
  cipherSuite: row.cipher_suite,
  tlsGrade: row.tls_grade,
  tlsScore: row.tls_score,
  tlsSupportedVersions: parse<string[]>(row.tls_supported_versions_json, []),
  sslLabsGrade: row.ssl_labs_grade,
  sslLabsScore: row.ssl_labs_score,
  sslLabsStatus: row.ssl_labs_status,
  sslLabsUrl: row.ssl_labs_url,
  sslLabsCheckedAt: row.ssl_labs_checked_at,
  sslLabsFindings: parse<string[]>(row.ssl_labs_findings_json, []),
  dns: parse(row.dns_json, null),
  flapping: Boolean(row.flapping),
  chain: parse(row.chain_json, []),
  problems: parse<string[]>(row.problems_json, []),
  rawError: row.raw_error
});

export const rowToChannel = (row: any): NotificationChannel => ({
  id: row.id,
  name: row.name,
  type: row.type,
  enabled: Boolean(row.enabled),
  config: decryptConfigSecrets(parse<Record<string, unknown>>(row.config_json, {})),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const rowToUser = (row: any): User => ({
  id: row.id,
  email: row.email,
  passwordHash: row.password_hash,
  role: row.role,
  createdAt: row.created_at
});

export const rowToIncident = (row: any): Incident => ({
  id: row.id,
  monitorId: row.monitor_id,
  status: row.status,
  severity: row.severity,
  message: row.message,
  startedAt: row.started_at,
  resolvedAt: row.resolved_at,
  acknowledgedAt: row.acknowledged_at,
  acknowledgedBy: row.acknowledged_by,
  assignee: row.assignee,
  notes: parse(row.notes_json, [])
});

export const rowToSubscription = (row: any): StatusSubscription => ({
  id: row.id,
  tags: parse<string[]>(row.tags_json, []),
  type: row.type === "webhook" ? "webhook" : "email",
  target: row.target,
  enabled: Boolean(row.enabled),
  createdAt: row.created_at
});

export const rowToApiToken = (row: any): ApiToken => ({
  id: row.id,
  name: row.name,
  tokenHash: row.token_hash,
  scopes: parse<string[]>(row.scopes_json, []),
  userId: row.user_id,
  createdAt: row.created_at,
  lastUsedAt: row.last_used_at
});

export const rowToDelivery = (row: any): NotificationDelivery => ({
  id: row.id,
  monitorId: row.monitor_id,
  channelId: row.channel_id,
  channelName: row.channel_name,
  provider: row.provider,
  target: row.target,
  severity: row.severity,
  status: row.status,
  deliveryStatus: row.delivery_status === "failed" ? "failed" : "sent",
  message: row.message,
  error: row.error,
  sentAt: row.sent_at
});
