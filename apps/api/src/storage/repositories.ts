import { db, rowToChannel, rowToMonitor, rowToResult, rowToUser } from "./db.js";
import { id } from "../utils/id.js";
import { addSecondsIso, nowIso } from "../utils/time.js";
import type { AlertingSettings, CheckResult, Monitor, NotificationChannel, SmtpSettings, User } from "../types.js";

export const users = {
  count(): number {
    const row = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count?: number } | undefined;
    return Number(row?.count ?? 0);
  },
  findByEmail(email: string): User | null {
    const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
    return row ? rowToUser(row) : null;
  },
  findById(userId: string): User | null {
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    return row ? rowToUser(row) : null;
  },
  createAdmin(email: string, passwordHash: string): User {
    const createdAt = nowIso();
    const user = { id: id(), email: email.toLowerCase(), passwordHash, role: "admin" as const, createdAt };
    db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?)").run(user.id, user.email, user.passwordHash, user.role, user.createdAt);
    return user;
  }
};

export const sessions = {
  create(userId: string, token: string, csrfToken: string) {
    db.prepare("INSERT INTO sessions VALUES (?, ?, ?, ?, ?)").run(
      token,
      userId,
      csrfToken,
      addSecondsIso(60 * 60 * 24 * 14),
      nowIso()
    );
  },
  find(token: string) {
    return db.prepare("SELECT * FROM sessions WHERE token = ? AND expires_at > ?").get(token, nowIso()) as any;
  },
  delete(token: string) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }
};

export const monitors = {
  list(): Monitor[] {
    return db.prepare("SELECT * FROM monitors ORDER BY name").all().map(rowToMonitor);
  },
  due(limit: number): Monitor[] {
    return db
      .prepare("SELECT * FROM monitors WHERE enabled = 1 AND (next_check_at IS NULL OR next_check_at <= ?) LIMIT ?")
      .all(nowIso(), limit)
      .map(rowToMonitor);
  },
  get(monitorId: string): Monitor | null {
    const row = db.prepare("SELECT * FROM monitors WHERE id = ?").get(monitorId);
    return row ? rowToMonitor(row) : null;
  },
  create(input: Omit<Monitor, "id" | "lastStatus" | "createdAt" | "updatedAt" | "nextCheckAt">): Monitor {
    const createdAt = nowIso();
    const monitor: Monitor = { ...input, id: id(), lastStatus: input.enabled ? "UNKNOWN" : "PAUSED", nextCheckAt: null, createdAt, updatedAt: createdAt };
    db.prepare(`
      INSERT INTO monitors VALUES (@id, @name, @host, @port, @type, @enabled, @intervalSeconds,
      @timeoutSeconds, @warningDays, @criticalDays, @sniEnabled, @sniHost, @validateCertificate,
      @allowSelfSigned, @tagsJson, @notes, @owner, @channelIdsJson, @maintenanceWindows,
      @lastStatus, @nextCheckAt, @createdAt, @updatedAt)
    `).run(serializeMonitor(monitor));
    return monitor;
  },
  update(monitor: Monitor): Monitor {
    const updated = { ...monitor, updatedAt: nowIso(), lastStatus: monitor.enabled ? monitor.lastStatus : "PAUSED" };
    db.prepare(`
      UPDATE monitors SET name=@name, host=@host, port=@port, type=@type, enabled=@enabled,
      interval_seconds=@intervalSeconds, timeout_seconds=@timeoutSeconds, warning_days=@warningDays,
      critical_days=@criticalDays, sni_enabled=@sniEnabled, sni_host=@sniHost,
      validate_certificate=@validateCertificate, allow_self_signed=@allowSelfSigned,
      tags_json=@tagsJson, notes=@notes, owner=@owner, channel_ids_json=@channelIdsJson,
      maintenance_windows=@maintenanceWindows, last_status=@lastStatus, next_check_at=@nextCheckAt,
      updated_at=@updatedAt WHERE id=@id
    `).run(serializeMonitor(updated));
    return updated;
  },
  delete(monitorId: string) {
    db.prepare("DELETE FROM monitors WHERE id = ?").run(monitorId);
  },
  markChecked(monitor: Monitor, result: CheckResult) {
    db.prepare("UPDATE monitors SET last_status = ?, next_check_at = ?, updated_at = ? WHERE id = ?").run(
      result.status,
      addSecondsIso(monitor.intervalSeconds),
      nowIso(),
      monitor.id
    );
  }
};

export const results = {
  list(monitorId: string, limit = 100): CheckResult[] {
    return db
      .prepare("SELECT * FROM check_results WHERE monitor_id = ? ORDER BY checked_at DESC LIMIT ?")
      .all(monitorId, limit)
      .map(rowToResult);
  },
  latestByMonitor(): Record<string, CheckResult> {
    const rows = db.prepare(`
      SELECT cr.* FROM check_results cr
      JOIN (SELECT monitor_id, MAX(checked_at) checked_at FROM check_results GROUP BY monitor_id) latest
      ON cr.monitor_id = latest.monitor_id AND cr.checked_at = latest.checked_at
    `).all();
    return Object.fromEntries(rows.map((row: any) => [row.monitor_id, rowToResult(row)]));
  },
  insert(result: CheckResult) {
    db.prepare(`
      INSERT INTO check_results VALUES (@id, @monitorId, @status, @severity, @message,
      @checkedAt, @durationMs, @daysRemaining, @validFrom, @validUntil, @commonName,
      @subjectAltNamesJson, @issuer, @serialNumber, @fingerprintSha256, @tlsVersion,
      @cipherSuite, @chainJson, @problemsJson, @rawError)
    `).run({
      ...result,
      subjectAltNamesJson: JSON.stringify(result.subjectAltNames),
      chainJson: JSON.stringify(result.chain),
      problemsJson: JSON.stringify(result.problems)
    });
  }
};

export const channels = {
  list(): NotificationChannel[] {
    return db.prepare("SELECT * FROM notification_channels ORDER BY name").all().map(rowToChannel);
  },
  get(channelId: string): NotificationChannel | null {
    const row = db.prepare("SELECT * FROM notification_channels WHERE id = ?").get(channelId);
    return row ? rowToChannel(row) : null;
  },
  upsert(channel: NotificationChannel) {
    db.prepare(`
      INSERT INTO notification_channels VALUES (@id, @name, @type, @enabled, @configJson, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET name=@name, type=@type, enabled=@enabled, config_json=@configJson, updated_at=@updatedAt
    `).run({ ...channel, configJson: JSON.stringify(channel.config) });
  },
  delete(channelId: string) {
    db.prepare("DELETE FROM notification_channels WHERE id = ?").run(channelId);
  }
};

export const alerts = {
  shouldSend(monitorId: string, status: string, fingerprint: string, resendAfterHours = 24) {
    const row = db.prepare("SELECT * FROM alert_history WHERE monitor_id=? ORDER BY sent_at DESC LIMIT 1").get(monitorId) as any;
    if (!row) return true;
    if (row.status !== status || row.fingerprint !== fingerprint) return true;
    return Date.now() - new Date(row.sent_at).getTime() > resendAfterHours * 3_600_000;
  },
  record(monitorId: string, channelId: string | null, severity: string, status: string, fingerprint: string, message: string) {
    db.prepare("INSERT INTO alert_history VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
      id(),
      monitorId,
      channelId,
      severity,
      status,
      fingerprint,
      message,
      nowIso()
    );
  },
  list(limit = 100) {
    return db.prepare("SELECT * FROM alert_history ORDER BY sent_at DESC LIMIT ?").all(limit);
  }
};

export const appSettings = {
  alerting(): AlertingSettings {
    return this.get("alerting", {
      resendAfterHours: 24,
      recoveryEnabled: true,
      quietHoursEnabled: false,
      quietStart: "22:00",
      quietEnd: "07:00",
      quietSuppressCritical: false
    });
  },
  smtp(): SmtpSettings {
    return this.get("smtp", {
      host: "",
      port: 587,
      username: "",
      password: "",
      from: "",
      secure: false,
      starttls: true
    });
  },
  get<T>(key: string, fallback: T): T {
    const row = db.prepare("SELECT value_json FROM settings WHERE key = ?").get(key) as { value_json?: string } | undefined;
    if (!row?.value_json) return fallback;
    try {
      return { ...fallback, ...JSON.parse(row.value_json) };
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T) {
    db.prepare("INSERT INTO settings VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json").run(
      key,
      JSON.stringify(value)
    );
  }
};

const serializeMonitor = (monitor: Monitor) => ({
  ...monitor,
  enabled: monitor.enabled ? 1 : 0,
  sniEnabled: monitor.sniEnabled ? 1 : 0,
  validateCertificate: monitor.validateCertificate ? 1 : 0,
  allowSelfSigned: monitor.allowSelfSigned ? 1 : 0,
  tagsJson: JSON.stringify(monitor.tags),
  channelIdsJson: JSON.stringify(monitor.notificationChannelIds)
});
