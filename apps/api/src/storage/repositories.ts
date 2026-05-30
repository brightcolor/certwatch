import { db, rowToApiToken, rowToChannel, rowToDelivery, rowToIncident, rowToInvite, rowToMembership, rowToMonitor, rowToResult, rowToSubscription, rowToTenant, rowToTenantGroup, rowToUser, rowToUserAlertSettings } from "./db.js";
import { id } from "../utils/id.js";
import { addSecondsIso, nowIso } from "../utils/time.js";
import type { AlertingSettings, ApiToken, BackupSettings, CheckResult, CtWatchSettings, DiscoverySettings, Incident, IncidentNote, MaintenanceSettings, Monitor, NotificationChannel, NotificationDelivery, NotificationRoute, RetentionSettings, SslLabsSettings, StatusPageSettings, StatusSubscription, SmtpSettings, Tenant, TenantGroup, TenantInvite, TenantMembership, TenantRole, TlsPolicySettings, User, UserAlertSettings } from "../types.js";
import { DEFAULT_TENANT_ID } from "../types.js";
import { decryptConfigSecrets, encryptConfigSecrets } from "../utils/secrets.js";

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
  list(): User[] {
    return db.prepare("SELECT * FROM users ORDER BY email").all().map(rowToUser);
  },
  create(email: string, passwordHash: string, role: "admin" | "viewer"): User {
    const createdAt = nowIso();
    const user = { id: id(), email: email.toLowerCase(), passwordHash, role, createdAt };
    db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?)").run(user.id, user.email, user.passwordHash, user.role, user.createdAt);
    return user;
  },
  update(userId: string, role: "admin" | "viewer", passwordHash?: string) {
    if (passwordHash) db.prepare("UPDATE users SET role = ?, password_hash = ? WHERE id = ?").run(role, passwordHash, userId);
    else db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
  },
  delete(userId: string) {
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  }
};

export const tenants = {
  list(): Tenant[] {
    return db.prepare("SELECT * FROM tenants ORDER BY name").all().map(rowToTenant);
  },
  get(tenantId: string): Tenant | null {
    const row = db.prepare("SELECT * FROM tenants WHERE id = ?").get(tenantId);
    return row ? rowToTenant(row) : null;
  },
  forUser(userId: string): TenantMembership[] {
    return db.prepare(`
      SELECT t.*, tm.tenant_id, tm.user_id, tm.role, tm.created_at, u.email
      FROM tenant_memberships tm
      JOIN tenants t ON t.id = tm.tenant_id
      JOIN users u ON u.id = tm.user_id
      WHERE tm.user_id = ?
      ORDER BY t.name
    `).all(userId).map(rowToMembership).map(withGroupRole);
  },
  members(tenantId: string): TenantMembership[] {
    return db.prepare(`
      SELECT t.*, tm.tenant_id, tm.user_id, tm.role, tm.created_at, u.email
      FROM tenant_memberships tm
      JOIN tenants t ON t.id = tm.tenant_id
      JOIN users u ON u.id = tm.user_id
      WHERE tm.tenant_id = ?
      ORDER BY u.email
    `).all(tenantId).map(rowToMembership).map(withGroupRole);
  },
  create(name: string, ownerUserId: string): Tenant {
    const createdAt = nowIso();
    const tenant = { id: id(), name, slug: uniqueSlug(slugify(name)), plan: "free" as const, status: "trialing" as const, monitorLimit: 50, userLimit: 5, createdAt };
    db.prepare("INSERT INTO tenants VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(tenant.id, tenant.name, tenant.slug, tenant.plan, tenant.status, tenant.monitorLimit, tenant.userLimit, tenant.createdAt);
    this.addMember(tenant.id, ownerUserId, "owner");
    return tenant;
  },
  addMember(tenantId: string, userId: string, role: TenantRole) {
    db.prepare("INSERT INTO tenant_memberships VALUES (?, ?, ?, ?) ON CONFLICT(tenant_id, user_id) DO UPDATE SET role = excluded.role").run(tenantId, userId, role, nowIso());
  },
  updateMember(tenantId: string, userId: string, role: TenantRole) {
    db.prepare("UPDATE tenant_memberships SET role = ? WHERE tenant_id = ? AND user_id = ?").run(role, tenantId, userId);
  },
  removeMember(tenantId: string, userId: string) {
    db.prepare("DELETE FROM tenant_memberships WHERE tenant_id = ? AND user_id = ?").run(tenantId, userId);
  }
};

export const tenantInvites = {
  list(tenantId: string): TenantInvite[] {
    return db.prepare(`
      SELECT * FROM tenant_invites
      WHERE tenant_id = ? AND accepted_at IS NULL AND expires_at > ?
      ORDER BY created_at DESC
    `).all(tenantId, nowIso()).map(rowToInvite);
  },
  create(tenantId: string, email: string, role: TenantRole, invitedByUserId?: string): TenantInvite {
    const invite = {
      id: id(),
      tenantId,
      email: email.toLowerCase(),
      role,
      token: id().replaceAll("-", ""),
      invitedByUserId: invitedByUserId ?? null,
      acceptedAt: null,
      expiresAt: addSecondsIso(60 * 60 * 24 * 14),
      createdAt: nowIso()
    };
    db.prepare(`
      INSERT INTO tenant_invites (id, tenant_id, email, role, token, invited_by_user_id, accepted_at, expires_at, created_at)
      VALUES (@id, @tenantId, @email, @role, @token, @invitedByUserId, @acceptedAt, @expiresAt, @createdAt)
    `).run(invite);
    return invite;
  },
  findByToken(token: string): TenantInvite | null {
    const row = db.prepare("SELECT * FROM tenant_invites WHERE token = ? AND accepted_at IS NULL AND expires_at > ?").get(token, nowIso());
    return row ? rowToInvite(row) : null;
  },
  accept(invite: TenantInvite, userId: string) {
    tenants.addMember(invite.tenantId, userId, invite.role);
    db.prepare("UPDATE tenant_invites SET accepted_at = ? WHERE id = ?").run(nowIso(), invite.id);
  },
  delete(inviteId: string, tenantId: string) {
    db.prepare("DELETE FROM tenant_invites WHERE id = ? AND tenant_id = ?").run(inviteId, tenantId);
  }
};

export const tenantGroups = {
  list(tenantId: string): TenantGroup[] {
    return db.prepare("SELECT * FROM tenant_groups WHERE tenant_id = ? ORDER BY name").all(tenantId).map((row) => ({
      ...rowToTenantGroup(row),
      memberIds: groupMemberIds(String((row as any).id))
    }));
  },
  forUser(tenantId: string, userId: string): TenantGroup[] {
    return db.prepare(`
      SELECT tg.* FROM tenant_groups tg
      JOIN tenant_group_members tgm ON tgm.group_id = tg.id
      WHERE tg.tenant_id = ? AND tgm.user_id = ?
      ORDER BY tg.name
    `).all(tenantId, userId).map((row) => ({
      ...rowToTenantGroup(row),
      memberIds: groupMemberIds(String((row as any).id))
    }));
  },
  create(tenantId: string, name: string, role: TenantRole, memberIds: string[] = []): TenantGroup {
    const now = nowIso();
    const group = { id: id(), tenantId, name, role, memberIds: [], createdAt: now, updatedAt: now };
    db.prepare("INSERT INTO tenant_groups VALUES (?, ?, ?, ?, ?, ?)").run(group.id, group.tenantId, group.name, group.role, group.createdAt, group.updatedAt);
    this.setMembers(group.id, tenantId, memberIds);
    return { ...group, memberIds: groupMemberIds(group.id) };
  },
  update(groupId: string, tenantId: string, name: string, role: TenantRole, memberIds: string[]): TenantGroup | null {
    db.prepare("UPDATE tenant_groups SET name = ?, role = ?, updated_at = ? WHERE id = ? AND tenant_id = ?").run(name, role, nowIso(), groupId, tenantId);
    this.setMembers(groupId, tenantId, memberIds);
    return this.get(groupId, tenantId);
  },
  get(groupId: string, tenantId: string): TenantGroup | null {
    const row = db.prepare("SELECT * FROM tenant_groups WHERE id = ? AND tenant_id = ?").get(groupId, tenantId);
    return row ? { ...rowToTenantGroup(row), memberIds: groupMemberIds(groupId) } : null;
  },
  setMembers(groupId: string, tenantId: string, memberIds: string[]) {
    if (!this.get(groupId, tenantId)) return;
    db.prepare("DELETE FROM tenant_group_members WHERE group_id = ?").run(groupId);
    for (const userId of unique(memberIds)) {
      if (db.prepare("SELECT user_id FROM tenant_memberships WHERE tenant_id = ? AND user_id = ?").get(tenantId, userId)) {
        db.prepare("INSERT OR IGNORE INTO tenant_group_members VALUES (?, ?, ?)").run(groupId, userId, nowIso());
      }
    }
  },
  setUserGroups(tenantId: string, userId: string, groupIds: string[]) {
    this.pruneUser(tenantId, userId);
    for (const groupId of unique(groupIds)) {
      if (this.get(groupId, tenantId) && db.prepare("SELECT user_id FROM tenant_memberships WHERE tenant_id = ? AND user_id = ?").get(tenantId, userId)) {
        db.prepare("INSERT OR IGNORE INTO tenant_group_members VALUES (?, ?, ?)").run(groupId, userId, nowIso());
      }
    }
  },
  delete(groupId: string, tenantId: string) {
    db.prepare("DELETE FROM tenant_groups WHERE id = ? AND tenant_id = ?").run(groupId, tenantId);
  },
  pruneUser(tenantId: string, userId: string) {
    db.prepare(`
      DELETE FROM tenant_group_members
      WHERE user_id = ? AND group_id IN (SELECT id FROM tenant_groups WHERE tenant_id = ?)
    `).run(userId, tenantId);
  }
};

export const userAlerts = {
  get(tenantId: string, userId: string): UserAlertSettings {
    const row = db.prepare("SELECT * FROM user_alert_settings WHERE tenant_id = ? AND user_id = ?").get(tenantId, userId);
    return row ? rowToUserAlertSettings(row) : defaultUserAlerts(tenantId, userId);
  },
  list(tenantId: string): UserAlertSettings[] {
    return db.prepare("SELECT * FROM user_alert_settings WHERE tenant_id = ? AND enabled = 1").all(tenantId).map(rowToUserAlertSettings);
  },
  upsert(input: UserAlertSettings): UserAlertSettings {
    const next = {
      ...input,
      updatedAt: nowIso()
    };
    db.prepare(`
      INSERT INTO user_alert_settings (tenant_id, user_id, enabled, tags_json, severities_json, channel_ids_json, recipients_json, updated_at)
      VALUES (@tenantId, @userId, @enabled, @tagsJson, @severitiesJson, @channelIdsJson, @recipientsJson, @updatedAt)
      ON CONFLICT(tenant_id, user_id) DO UPDATE SET enabled=@enabled, tags_json=@tagsJson, severities_json=@severitiesJson,
        channel_ids_json=@channelIdsJson, recipients_json=@recipientsJson, updated_at=@updatedAt
    `).run({
      ...next,
      enabled: next.enabled ? 1 : 0,
      tagsJson: JSON.stringify(next.tags),
      severitiesJson: JSON.stringify(next.severities),
      channelIdsJson: JSON.stringify(next.channelIds),
      recipientsJson: JSON.stringify(next.recipients)
    });
    return next;
  },
  deleteForUser(tenantId: string, userId: string) {
    db.prepare("DELETE FROM user_alert_settings WHERE tenant_id = ? AND user_id = ?").run(tenantId, userId);
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

export const apiTokens = {
  list(): ApiToken[] {
    return db.prepare("SELECT * FROM api_tokens ORDER BY created_at DESC").all().map(rowToApiToken);
  },
  findByHash(tokenHash: string): ApiToken | null {
    const row = db.prepare("SELECT * FROM api_tokens WHERE token_hash = ?").get(tokenHash);
    return row ? rowToApiToken(row) : null;
  },
  create(name: string, tokenHash: string, scopes: string[], userId: string): ApiToken {
    const token = { id: id(), name, tokenHash, scopes, userId, createdAt: nowIso(), lastUsedAt: null };
    db.prepare("INSERT INTO api_tokens VALUES (?, ?, ?, ?, ?, ?, ?)").run(token.id, token.name, token.tokenHash, JSON.stringify(token.scopes), token.userId, token.createdAt, token.lastUsedAt);
    return token;
  },
  markUsed(tokenId: string) {
    db.prepare("UPDATE api_tokens SET last_used_at = ? WHERE id = ?").run(nowIso(), tokenId);
  },
  delete(tokenId: string) {
    db.prepare("DELETE FROM api_tokens WHERE id = ?").run(tokenId);
  }
};

export const monitors = {
  list(tenantId = DEFAULT_TENANT_ID): Monitor[] {
    return db.prepare("SELECT * FROM monitors WHERE tenant_id = ? ORDER BY name").all(tenantId).map(rowToMonitor);
  },
  due(limit: number): Monitor[] {
    return db
      .prepare("SELECT * FROM monitors WHERE enabled = 1 AND (next_check_at IS NULL OR next_check_at <= ?) LIMIT ?")
      .all(nowIso(), limit)
      .map(rowToMonitor);
  },
  get(monitorId: string, tenantId?: string): Monitor | null {
    const row = tenantId ? db.prepare("SELECT * FROM monitors WHERE id = ? AND tenant_id = ?").get(monitorId, tenantId) : db.prepare("SELECT * FROM monitors WHERE id = ?").get(monitorId);
    return row ? rowToMonitor(row) : null;
  },
  create(input: Omit<Monitor, "id" | "lastStatus" | "createdAt" | "updatedAt" | "nextCheckAt">): Monitor {
    const createdAt = nowIso();
    const monitor: Monitor = { ...input, tenantId: input.tenantId ?? DEFAULT_TENANT_ID, id: id(), lastStatus: input.enabled ? "UNKNOWN" : "PAUSED", nextCheckAt: null, createdAt, updatedAt: createdAt };
    db.prepare(`
      INSERT INTO monitors (id, tenant_id, name, host, port, type, enabled, interval_seconds,
      timeout_seconds, warning_days, critical_days, grace_period_seconds, sni_enabled, sni_host, validate_certificate,
      allow_self_signed, tags_json, notes, owner, channel_ids_json, notification_recipients_json,
      config_json, maintenance_windows, last_status, next_check_at, created_at, updated_at)
      VALUES (@id, @tenantId, @name, @host, @port, @type, @enabled, @intervalSeconds,
      @timeoutSeconds, @warningDays, @criticalDays, @gracePeriodSeconds, @sniEnabled, @sniHost, @validateCertificate,
      @allowSelfSigned, @tagsJson, @notes, @owner, @channelIdsJson, @notificationRecipientsJson,
      @configJson, @maintenanceWindows, @lastStatus, @nextCheckAt, @createdAt, @updatedAt)
    `).run(serializeMonitor(monitor));
    return monitor;
  },
  update(monitor: Monitor): Monitor {
    const updated = { ...monitor, updatedAt: nowIso(), lastStatus: monitor.enabled ? monitor.lastStatus : "PAUSED" };
    db.prepare(`
      UPDATE monitors SET name=@name, host=@host, port=@port, type=@type, enabled=@enabled,
      interval_seconds=@intervalSeconds, timeout_seconds=@timeoutSeconds, warning_days=@warningDays,
      critical_days=@criticalDays, grace_period_seconds=@gracePeriodSeconds, sni_enabled=@sniEnabled, sni_host=@sniHost,
      validate_certificate=@validateCertificate, allow_self_signed=@allowSelfSigned,
      tags_json=@tagsJson, notes=@notes, owner=@owner, channel_ids_json=@channelIdsJson,
      notification_recipients_json=@notificationRecipientsJson,
      config_json=@configJson,
      maintenance_windows=@maintenanceWindows, last_status=@lastStatus, next_check_at=@nextCheckAt,
      updated_at=@updatedAt WHERE id=@id
    `).run(serializeMonitor(updated));
    return updated;
  },
  delete(monitorId: string, tenantId?: string) {
    if (tenantId && !this.get(monitorId, tenantId)) return;
    db.prepare("DELETE FROM check_results WHERE monitor_id = ?").run(monitorId);
    db.prepare("DELETE FROM alert_history WHERE monitor_id = ?").run(monitorId);
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
  latestSslLabsForHost(host: string): CheckResult | undefined {
    const row = db.prepare(`
      SELECT cr.* FROM check_results cr
      JOIN monitors m ON m.id = cr.monitor_id
      WHERE lower(m.host) = lower(?) AND cr.ssl_labs_checked_at IS NOT NULL
      ORDER BY cr.ssl_labs_checked_at DESC
      LIMIT 1
    `).get(host);
    return row ? rowToResult(row) : undefined;
  },
  insert(result: CheckResult) {
    db.prepare(`
      INSERT INTO check_results (id, monitor_id, status, severity, message, checked_at,
      duration_ms, days_remaining, valid_from, valid_until, common_name, subject_alt_names_json,
      issuer, serial_number, fingerprint_sha256, tls_version, cipher_suite, tls_grade, tls_score,
      tls_grade_reasons_json, tls_supported_versions_json, ssl_labs_grade, ssl_labs_score, ssl_labs_status, ssl_labs_url,
      ssl_labs_checked_at, ssl_labs_findings_json, dns_json, flapping, chain_json, problems_json, raw_error)
      VALUES (@id, @monitorId, @status, @severity, @message, @checkedAt, @durationMs,
      @daysRemaining, @validFrom, @validUntil, @commonName, @subjectAltNamesJson, @issuer,
      @serialNumber, @fingerprintSha256, @tlsVersion, @cipherSuite, @tlsGrade, @tlsScore,
      @tlsGradeReasonsJson, @tlsSupportedVersionsJson, @sslLabsGrade, @sslLabsScore, @sslLabsStatus, @sslLabsUrl,
      @sslLabsCheckedAt, @sslLabsFindingsJson, @dnsJson, @flapping, @chainJson, @problemsJson, @rawError)
    `).run({
      ...result,
      flapping: result.flapping ? 1 : 0,
      subjectAltNamesJson: JSON.stringify(result.subjectAltNames),
      tlsGradeReasonsJson: JSON.stringify(result.tlsGradeReasons ?? []),
      tlsSupportedVersionsJson: JSON.stringify(result.tlsSupportedVersions ?? []),
      sslLabsFindingsJson: JSON.stringify(result.sslLabsFindings ?? []),
      dnsJson: result.dns ? JSON.stringify(result.dns) : null,
      chainJson: JSON.stringify(result.chain),
      problemsJson: JSON.stringify(result.problems)
    });
  },
  consecutiveFailureStartedAt(monitorId: string): string | null {
    const rows = db.prepare("SELECT status, checked_at FROM check_results WHERE monitor_id = ? ORDER BY checked_at DESC LIMIT 500").all(monitorId) as Array<{ status: string; checked_at: string }>;
    const failures = [];
    for (const row of rows) {
      if (row.status === "OK") break;
      failures.push(row);
    }
    return failures.at(-1)?.checked_at ?? null;
  },
  listRecent(monitorId: string, limit = 10): CheckResult[] {
    return db.prepare("SELECT * FROM check_results WHERE monitor_id = ? ORDER BY checked_at DESC LIMIT ?").all(monitorId, limit).map(rowToResult);
  },
  prune(days: number) {
    db.prepare("DELETE FROM check_results WHERE checked_at < ?").run(new Date(Date.now() - days * 86_400_000).toISOString());
  }
};

export const incidents = {
  list(limit = 100): Incident[] {
    return db.prepare("SELECT * FROM incidents ORDER BY started_at DESC LIMIT ?").all(limit).map(rowToIncident);
  },
  listForMonitor(monitorId: string, limit = 50): Incident[] {
    return db.prepare("SELECT * FROM incidents WHERE monitor_id = ? ORDER BY started_at DESC LIMIT ?").all(monitorId, limit).map(rowToIncident);
  },
  openForMonitor(monitorId: string): Incident | null {
    const row = db.prepare("SELECT * FROM incidents WHERE monitor_id = ? AND resolved_at IS NULL ORDER BY started_at DESC LIMIT 1").get(monitorId);
    return row ? rowToIncident(row) : null;
  },
  sync(monitor: Monitor, result: CheckResult): Incident | null {
    const open = this.openForMonitor(monitor.id);
    if (result.status === "OK") {
      if (open) db.prepare("UPDATE incidents SET resolved_at = ? WHERE id = ?").run(result.checkedAt, open.id);
      return open ? { ...open, resolvedAt: result.checkedAt } : null;
    }
    if (open) {
      db.prepare("UPDATE incidents SET status = ?, severity = ?, message = ? WHERE id = ?").run(result.status, result.severity, result.message, open.id);
      return { ...open, status: result.status, severity: result.severity, message: result.message };
    }
    const incident = { id: id(), monitorId: monitor.id, status: result.status, severity: result.severity, message: result.message, startedAt: result.checkedAt, resolvedAt: null, acknowledgedAt: null, acknowledgedBy: null, assignee: null, notes: [] };
    db.prepare("INSERT INTO incidents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(incident.id, incident.monitorId, incident.status, incident.severity, incident.message, incident.startedAt, incident.resolvedAt, incident.acknowledgedAt, incident.acknowledgedBy, incident.assignee, JSON.stringify(incident.notes));
    return incident;
  },
  acknowledge(incidentId: string, userEmail: string, assignee?: string | null): Incident | null {
    db.prepare("UPDATE incidents SET acknowledged_at = ?, acknowledged_by = ?, assignee = COALESCE(?, assignee) WHERE id = ?").run(nowIso(), userEmail, assignee ?? null, incidentId);
    const row = db.prepare("SELECT * FROM incidents WHERE id = ?").get(incidentId);
    return row ? rowToIncident(row) : null;
  },
  addNote(incidentId: string, userEmail: string, text: string): Incident | null {
    const row = db.prepare("SELECT * FROM incidents WHERE id = ?").get(incidentId);
    if (!row) return null;
    const current = rowToIncident(row);
    const note: IncidentNote = { id: id(), author: userEmail, text, createdAt: nowIso() };
    const notes = [...current.notes, note];
    db.prepare("UPDATE incidents SET notes_json = ? WHERE id = ?").run(JSON.stringify(notes), incidentId);
    return { ...current, notes };
  }
};

export const deliveries = {
  list(limit = 100): NotificationDelivery[] {
    return db.prepare("SELECT * FROM notification_deliveries ORDER BY sent_at DESC LIMIT ?").all(limit).map(rowToDelivery);
  },
  record(input: Omit<NotificationDelivery, "id" | "sentAt">) {
    const delivery = { ...input, id: id(), sentAt: nowIso() };
    db.prepare("INSERT INTO notification_deliveries VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      delivery.id,
      delivery.monitorId,
      delivery.channelId ?? null,
      delivery.channelName,
      delivery.provider,
      delivery.target,
      delivery.severity,
      delivery.status,
      delivery.deliveryStatus,
      delivery.message,
      delivery.error ?? null,
      delivery.sentAt
    );
  },
  prune(days: number) {
    db.prepare("DELETE FROM notification_deliveries WHERE sent_at < ?").run(new Date(Date.now() - days * 86_400_000).toISOString());
  }
};

export const subscriptions = {
  list(): StatusSubscription[] {
    return db.prepare("SELECT * FROM status_subscriptions ORDER BY created_at DESC").all().map(rowToSubscription);
  },
  create(tags: string[], type: "email" | "webhook", target: string, enabled = false): StatusSubscription {
    const subscription = { id: id(), tags, type, target, enabled, createdAt: nowIso() };
    db.prepare("INSERT INTO status_subscriptions VALUES (?, ?, ?, ?, ?, ?)").run(subscription.id, JSON.stringify(tags), type, target, enabled ? 1 : 0, subscription.createdAt);
    return subscription;
  },
  confirm(subscriptionId: string): StatusSubscription | null {
    db.prepare("UPDATE status_subscriptions SET enabled = 1 WHERE id = ?").run(subscriptionId);
    const row = db.prepare("SELECT * FROM status_subscriptions WHERE id = ?").get(subscriptionId);
    return row ? rowToSubscription(row) : null;
  },
  delete(subscriptionId: string) {
    db.prepare("DELETE FROM status_subscriptions WHERE id = ?").run(subscriptionId);
  }
};

export const channels = {
  list(tenantId = DEFAULT_TENANT_ID): NotificationChannel[] {
    return db.prepare("SELECT * FROM notification_channels WHERE tenant_id = ? ORDER BY name").all(tenantId).map(rowToChannel);
  },
  get(channelId: string, tenantId?: string): NotificationChannel | null {
    const row = tenantId ? db.prepare("SELECT * FROM notification_channels WHERE id = ? AND tenant_id = ?").get(channelId, tenantId) : db.prepare("SELECT * FROM notification_channels WHERE id = ?").get(channelId);
    return row ? rowToChannel(row) : null;
  },
  upsert(channel: NotificationChannel) {
    db.prepare(`
      INSERT INTO notification_channels (id, tenant_id, name, type, enabled, config_json, created_at, updated_at)
      VALUES (@id, @tenantId, @name, @type, @enabled, @configJson, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET tenant_id=@tenantId, name=@name, type=@type, enabled=@enabled, config_json=@configJson, updated_at=@updatedAt
    `).run({ ...channel, tenantId: channel.tenantId ?? DEFAULT_TENANT_ID, configJson: JSON.stringify(encryptConfigSecrets(channel.config ?? {})) });
  },
  delete(channelId: string, tenantId?: string) {
    if (tenantId) db.prepare("DELETE FROM notification_channels WHERE id = ? AND tenant_id = ?").run(channelId, tenantId);
    else db.prepare("DELETE FROM notification_channels WHERE id = ?").run(channelId);
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
  },
  prune(days: number) {
    db.prepare("DELETE FROM alert_history WHERE sent_at < ?").run(new Date(Date.now() - days * 86_400_000).toISOString());
  }
};

export const appSettings = {
  alerting(tenantId?: string): AlertingSettings {
    return this.get("alerting", {
      resendAfterHours: 24,
      recoveryEnabled: true,
      certificateChangeAlerts: true,
      dnsChangeAlerts: false,
      tlsDeteriorationAlerts: true,
      tlsDeteriorationThreshold: 5,
      quietHoursEnabled: false,
      quietStart: "22:00",
      quietEnd: "07:00",
      quietSuppressCritical: false,
      flappingThreshold: 4
    }, tenantId);
  },
  smtp(tenantId?: string): SmtpSettings {
    return this.get("smtp", {
      host: "",
      port: 587,
      username: "",
      password: "",
      from: "",
      secure: false,
      starttls: true
    }, tenantId);
  },
  retention(tenantId?: string): RetentionSettings {
    return this.get("retention", { checkResultsDays: 365, alertHistoryDays: 365 }, tenantId);
  },
  notificationRoutes(tenantId?: string): NotificationRoute[] {
    return this.get("notificationRoutes", [], tenantId);
  },
  ctWatch(tenantId?: string): CtWatchSettings {
    return this.get("ctWatch", { enabled: false, domains: [], lastSeen: {} }, tenantId);
  },
  maintenance(tenantId?: string): MaintenanceSettings {
    return this.get("maintenance", { windows: [] }, tenantId);
  },
  tlsPolicy(tenantId?: string): TlsPolicySettings {
    return this.get("tlsPolicy", { profile: "modern", minimumTlsVersion: "TLSv1.2", weakCipherPenalty: 40, requireSan: true, intensiveScan: true }, tenantId);
  },
  sslLabs(tenantId?: string): SslLabsSettings {
    return this.get("sslLabs", { enabled: false, registeredEmail: "", intervalHours: 24, maxAgeHours: 24, timeoutSeconds: 90, startNewScans: false, publishResults: false }, tenantId);
  },
  statusPages(tenantId?: string): StatusPageSettings {
    return this.get("statusPages", { pages: [] }, tenantId);
  },
  discovery(tenantId?: string): DiscoverySettings {
    return this.get("discovery", { enabled: false, intervalHours: 24, domains: [], suggestions: [], lastRunAt: null }, tenantId);
  },
  backups(tenantId?: string): BackupSettings {
    return this.get("backups", { enabled: false, intervalHours: 24, keep: 7, lastRunAt: null }, tenantId);
  },
  get<T>(key: string, fallback: T, tenantId?: string): T {
    const row = db.prepare("SELECT value_json FROM settings WHERE key = ?").get(settingKey(key, tenantId)) as { value_json?: string } | undefined;
    if (!row?.value_json) return fallback;
    try {
      const parsed = JSON.parse(row.value_json);
      const value = isPlainSettingsObject(parsed) ? decryptConfigSecrets(parsed) : parsed;
      if (Array.isArray(fallback)) return (Array.isArray(value) ? value : fallback) as T;
      return { ...fallback, ...value };
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T, tenantId?: string) {
    const stored = isPlainSettingsObject(value) ? encryptConfigSecrets(value as Record<string, unknown>) : value;
    db.prepare("INSERT INTO settings VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json").run(
      settingKey(key, tenantId),
      JSON.stringify(stored)
    );
  }
};

const serializeMonitor = (monitor: Monitor) => ({
  ...monitor,
  tenantId: monitor.tenantId ?? DEFAULT_TENANT_ID,
  enabled: monitor.enabled ? 1 : 0,
  sniEnabled: monitor.sniEnabled ? 1 : 0,
  validateCertificate: monitor.validateCertificate ? 1 : 0,
  allowSelfSigned: monitor.allowSelfSigned ? 1 : 0,
  tagsJson: JSON.stringify(monitor.tags),
  channelIdsJson: JSON.stringify(monitor.notificationChannelIds),
  notificationRecipientsJson: JSON.stringify(monitor.notificationRecipients ?? {}),
  configJson: JSON.stringify(encryptConfigSecrets(monitor.config ?? {}))
});

const isPlainSettingsObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const settingKey = (key: string, tenantId?: string) => tenantId && tenantId !== DEFAULT_TENANT_ID ? `tenant:${tenantId}:${key}` : key;

const withGroupRole = (membership: TenantMembership): TenantMembership => {
  const groups = tenantGroups.forUser(membership.tenantId, membership.userId);
  return {
    ...membership,
    effectiveRole: highestRole([membership.role, ...groups.map((group) => group.role)]),
    groupIds: groups.map((group) => group.id),
    groupNames: groups.map((group) => group.name)
  };
};

const highestRole = (roles: TenantRole[]): TenantRole =>
  roles.sort((a, b) => roleRank(b) - roleRank(a))[0] ?? "viewer";

const roleRank = (role: TenantRole) => ({ owner: 4, admin: 3, member: 2, viewer: 1 }[role]);

const groupMemberIds = (groupId: string) =>
  (db.prepare("SELECT user_id FROM tenant_group_members WHERE group_id = ? ORDER BY created_at").all(groupId) as Array<{ user_id: string }>).map((row) => row.user_id);

const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

const defaultUserAlerts = (tenantId: string, userId: string): UserAlertSettings => ({
  tenantId,
  userId,
  enabled: false,
  tags: [],
  severities: ["warning", "recovery"],
  channelIds: [],
  recipients: {},
  updatedAt: nowIso()
});

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "workspace";

const uniqueSlug = (base: string) => {
  let slug = base;
  let suffix = 2;
  while (db.prepare("SELECT id FROM tenants WHERE slug = ?").get(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
};
