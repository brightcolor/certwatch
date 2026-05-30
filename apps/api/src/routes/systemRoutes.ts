import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { id } from "../utils/id.js";
import { nowIso } from "../utils/time.js";
import { env } from "../config/env.js";
import { alerts, appSettings, channels, incidents, monitors, results, subscriptions, tenantGroups, tenantInvites, tenants, userAlerts, users } from "../storage/repositories.js";
import { testChannel } from "../notifications/service.js";
import { createImpersonationSession, requireSuperAdmin, requireTenantRole, setSessionCookie } from "../auth/auth.js";
import { discoverMonitors } from "../checks/discovery.js";
import rootPackage from "../../../../package.json" with { type: "json" };

export const systemRoutes = Router();

systemRoutes.get("/status", (_req, res) => {
  const all = monitors.list(_req.currentTenant!.id);
  const counts = all.reduce<Record<string, number>>((acc, monitor) => {
    acc[monitor.lastStatus] = (acc[monitor.lastStatus] ?? 0) + 1;
    return acc;
  }, {});
  res.json({
    total: all.length,
    ok: counts.OK ?? 0,
    warning: counts.WARNING ?? 0,
    critical: counts.CRITICAL ?? 0,
    down: counts.DOWN ?? 0,
    paused: counts.PAUSED ?? 0,
    unknown: counts.UNKNOWN ?? 0,
    latestResults: Object.values(results.latestByMonitor()).slice(0, 10)
  });
});

systemRoutes.get("/alerts", (_req, res) => res.json(alerts.list()));
systemRoutes.get("/incidents", (_req, res) => res.json(incidents.list()));
systemRoutes.get("/subscriptions", (_req, res) => res.json(subscriptions.list()));
systemRoutes.delete("/subscriptions/:id", (req, res) => {
  subscriptions.delete(req.params.id);
  res.status(204).end();
});
systemRoutes.get("/health", (_req, res) => res.json({ ok: true }));
systemRoutes.get("/version", (_req, res) => res.json({ name: rootPackage.name, version: rootPackage.version }));
systemRoutes.get("/tenants", (req, res) => res.json(req.tenantMemberships?.map(publicMembership) ?? []));
systemRoutes.post("/tenants", (req, res) => {
  const parsed = z.object({ name: z.string().trim().min(2).max(120) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Workspace name is required." });
  const tenant = tenants.create(parsed.data.name, req.user!.id);
  res.status(201).json({ tenantId: tenant.id, role: "owner", tenant });
});
systemRoutes.get("/tenants/:id/members", requireTenantRole("owner", "admin"), (req, res) => {
  if (req.params.id !== req.currentTenant!.id) return res.status(403).json({ error: "Select the workspace first." });
  res.json(tenants.members(req.currentTenant!.id).map(publicMember));
});
systemRoutes.post("/tenants/:id/members", requireTenantRole("owner", "admin"), (req, res) => {
  if (req.params.id !== req.currentTenant!.id) return res.status(403).json({ error: "Select the workspace first." });
  const parsed = memberSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid member." });
  if (!canAssignRole(req, parsed.data.role)) return res.status(403).json({ error: "Only workspace owners can assign owner rights." });
  const user = users.findByEmail(parsed.data.email);
  if (!user) return res.status(404).json({ error: "User must exist before it can be added to a workspace." });
  const tenant = tenants.get(req.currentTenant!.id);
  if (tenant && tenant.userLimit > 0 && tenants.members(tenant.id).length >= tenant.userLimit) return res.status(402).json({ error: "Workspace user limit reached." });
  tenants.addMember(req.currentTenant!.id, user.id, parsed.data.role);
  res.status(201).json(publicMember(tenants.members(req.currentTenant!.id).find((item) => item.userId === user.id)!));
});
systemRoutes.put("/tenants/:id/members/:userId", requireTenantRole("owner", "admin"), (req, res) => {
  if (req.params.id !== req.currentTenant!.id) return res.status(403).json({ error: "Select the workspace first." });
  const parsed = updateMemberSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid member update." });
  if (parsed.data.role && !canAssignRole(req, parsed.data.role)) return res.status(403).json({ error: "Only workspace owners can assign owner rights." });
  if (req.params.userId === req.user!.id && parsed.data.role && parsed.data.role !== "owner" && req.tenantRole === "owner") return res.status(409).json({ error: "You cannot downgrade your own owner membership." });
  if (parsed.data.role) tenants.updateMember(req.currentTenant!.id, req.params.userId, parsed.data.role);
  if (parsed.data.groupIds) tenantGroups.setUserGroups(req.currentTenant!.id, req.params.userId, parsed.data.groupIds);
  const member = tenants.members(req.currentTenant!.id).find((item) => item.userId === req.params.userId);
  if (!member) return res.status(404).json({ error: "Member not found." });
  res.json(publicMember(member));
});
systemRoutes.delete("/tenants/:id/members/:userId", requireTenantRole("owner", "admin"), (req, res) => {
  if (req.params.id !== req.currentTenant!.id) return res.status(403).json({ error: "Select the workspace first." });
  if (req.params.userId === req.user!.id) return res.status(409).json({ error: "You cannot remove your own workspace membership." });
  tenantGroups.pruneUser(req.currentTenant!.id, req.params.userId);
  userAlerts.deleteForUser(req.currentTenant!.id, req.params.userId);
  tenants.removeMember(req.currentTenant!.id, req.params.userId);
  res.status(204).end();
});
systemRoutes.get("/tenants/:id/groups", requireTenantRole("owner", "admin"), (req, res) => {
  if (req.params.id !== req.currentTenant!.id) return res.status(403).json({ error: "Select the workspace first." });
  res.json(tenantGroups.list(req.currentTenant!.id));
});
systemRoutes.post("/tenants/:id/groups", requireTenantRole("owner", "admin"), (req, res) => {
  if (req.params.id !== req.currentTenant!.id) return res.status(403).json({ error: "Select the workspace first." });
  const parsed = groupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid group." });
  if (!canAssignRole(req, parsed.data.role)) return res.status(403).json({ error: "Only workspace owners can create owner groups." });
  res.status(201).json(tenantGroups.create(req.currentTenant!.id, parsed.data.name, parsed.data.role, parsed.data.memberIds));
});
systemRoutes.put("/tenants/:id/groups/:groupId", requireTenantRole("owner", "admin"), (req, res) => {
  if (req.params.id !== req.currentTenant!.id) return res.status(403).json({ error: "Select the workspace first." });
  const parsed = groupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid group." });
  if (!canAssignRole(req, parsed.data.role)) return res.status(403).json({ error: "Only workspace owners can assign owner groups." });
  const group = tenantGroups.update(req.params.groupId, req.currentTenant!.id, parsed.data.name, parsed.data.role, parsed.data.memberIds);
  if (!group) return res.status(404).json({ error: "Group not found." });
  res.json(group);
});
systemRoutes.delete("/tenants/:id/groups/:groupId", requireTenantRole("owner", "admin"), (req, res) => {
  if (req.params.id !== req.currentTenant!.id) return res.status(403).json({ error: "Select the workspace first." });
  tenantGroups.delete(req.params.groupId, req.currentTenant!.id);
  res.status(204).end();
});
systemRoutes.get("/tenants/:id/invites", requireTenantRole("owner", "admin"), (req, res) => {
  if (req.params.id !== req.currentTenant!.id) return res.status(403).json({ error: "Select the workspace first." });
  res.json(tenantInvites.list(req.currentTenant!.id).map(publicInvite));
});
systemRoutes.post("/tenants/:id/invites", requireTenantRole("owner", "admin"), (req, res) => {
  if (req.params.id !== req.currentTenant!.id) return res.status(403).json({ error: "Select the workspace first." });
  const parsed = memberSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid invitation." });
  if (!canAssignRole(req, parsed.data.role)) return res.status(403).json({ error: "Only workspace owners can invite owners." });
  const tenant = tenants.get(req.currentTenant!.id);
  const memberCount = tenants.members(req.currentTenant!.id).length;
  const inviteCount = tenantInvites.list(req.currentTenant!.id).length;
  if (tenant && tenant.userLimit > 0 && memberCount + inviteCount >= tenant.userLimit) return res.status(402).json({ error: "Workspace user limit reached." });

  const user = users.findByEmail(parsed.data.email);
  if (user) {
    tenants.addMember(req.currentTenant!.id, user.id, parsed.data.role);
    const member = tenants.members(req.currentTenant!.id).find((item) => item.userId === user.id);
    return res.status(201).json({ member: member ? publicMember(member) : null, invite: null });
  }

  const existing = tenantInvites.list(req.currentTenant!.id).find((item) => item.email === parsed.data.email);
  const invite = existing ?? tenantInvites.create(req.currentTenant!.id, parsed.data.email, parsed.data.role, req.user!.id);
  res.status(existing ? 200 : 201).json({ member: null, invite: publicInvite(invite) });
});
systemRoutes.delete("/tenants/:id/invites/:inviteId", requireTenantRole("owner", "admin"), (req, res) => {
  if (req.params.id !== req.currentTenant!.id) return res.status(403).json({ error: "Select the workspace first." });
  tenantInvites.delete(req.params.inviteId, req.currentTenant!.id);
  res.status(204).end();
});
systemRoutes.get("/me/alert-settings", (req, res) => res.json(userAlerts.get(req.currentTenant!.id, req.user!.id)));
systemRoutes.put("/me/alert-settings", (req, res) => {
  const parsed = userAlertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid personal alert settings." });
  res.json(userAlerts.upsert({ ...parsed.data, tenantId: req.currentTenant!.id, userId: req.user!.id, updatedAt: nowIso() }));
});
systemRoutes.get("/settings/ct-watch", (req, res) => res.json(appSettings.ctWatch(req.currentTenant!.id)));
systemRoutes.put("/settings/ct-watch", requireTenantRole("owner", "admin"), (req, res) => {
  const parsed = ctWatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid CT watch settings." });
  appSettings.set("ctWatch", parsed.data, req.currentTenant!.id);
  res.json(parsed.data);
});
systemRoutes.post("/ct-watch/check", async (req, res) => res.json(await checkCtWatch(req.currentTenant!.id)));
systemRoutes.post("/discover", async (req, res) => {
  const parsed = discoverSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid discovery request." });
  res.json({ monitors: await discoverMonitors(parsed.data.domain) });
});
systemRoutes.get("/settings/alerting", (req, res) => res.json(appSettings.alerting(req.currentTenant!.id)));
systemRoutes.put("/settings/alerting", requireTenantRole("owner", "admin"), (req, res) => {
  const parsed = alertingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid alerting settings." });
  appSettings.set("alerting", parsed.data, req.currentTenant!.id);
  res.json(parsed.data);
});
systemRoutes.get("/settings/smtp", (req, res) => res.json(redactConfig(appSettings.smtp(req.currentTenant!.id))));
systemRoutes.put("/settings/smtp", requireTenantRole("owner", "admin"), (req, res) => {
  const current = appSettings.smtp(req.currentTenant!.id);
  const parsed = smtpSchema.safeParse({ ...current, ...req.body });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid SMTP settings." });
  const next = { ...parsed.data, password: parsed.data.password === "********" ? current.password : parsed.data.password };
  appSettings.set("smtp", next, req.currentTenant!.id);
  res.json(redactConfig(next));
});
systemRoutes.get("/settings/retention", (req, res) => res.json(appSettings.retention(req.currentTenant!.id)));
systemRoutes.put("/settings/retention", requireTenantRole("owner", "admin"), (req, res) => {
  const parsed = retentionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid retention settings." });
  appSettings.set("retention", parsed.data, req.currentTenant!.id);
  res.json(parsed.data);
});
systemRoutes.get("/notification-routes", (req, res) => res.json(appSettings.notificationRoutes(req.currentTenant!.id)));
systemRoutes.put("/notification-routes", requireTenantRole("owner", "admin"), (req, res) => {
  const parsed = z.array(routeSchema).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid notification routes." });
  appSettings.set("notificationRoutes", parsed.data, req.currentTenant!.id);
  res.json(parsed.data);
});
systemRoutes.get("/notification-channels", (req, res) => res.json(channels.list(req.currentTenant!.id).map(redactChannel)));

systemRoutes.post("/notification-channels", requireTenantRole("owner", "admin"), (req, res) => {
  const parsed = channelSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid channel." });
  const now = nowIso();
  const existing = parsed.data.id ? channels.get(parsed.data.id, req.currentTenant!.id) : null;
  const channel = {
    ...parsed.data,
    tenantId: req.currentTenant!.id,
    id: parsed.data.id ?? id(),
    config: mergeMaskedConfig(existing?.config ?? {}, parsed.data.config ?? {}),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
  channels.upsert(channel);
  res.status(201).json(redactChannel(channel));
});

systemRoutes.delete("/notification-channels/:id", requireTenantRole("owner", "admin"), (req, res) => {
  channels.delete(req.params.id, req.currentTenant!.id);
  res.status(204).end();
});

systemRoutes.post("/notification-channels/test", async (req, res) => {
  const channel = req.body.id ? channels.get(String(req.body.id), req.currentTenant!.id) : { ...req.body, tenantId: req.currentTenant!.id };
  if (!channel) return res.status(404).json({ error: "Notification channel not found." });
  await testChannel(channel);
  res.json({ ok: true });
});

systemRoutes.get("/platform-settings", requireSuperAdmin, (_req, res) => {
  res.json(appSettings.platform());
});

systemRoutes.put("/platform-settings", requireSuperAdmin, (req, res) => {
  const parsed = platformSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid platform settings." });
  appSettings.set("platform", parsed.data);
  res.json(parsed.data);
});

systemRoutes.get("/users", requireSuperAdmin, (_req, res) => {
  res.json(users.list().map(publicUser));
});

systemRoutes.post("/users", requireSuperAdmin, async (req, res) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid user." });
  if (users.findByEmail(parsed.data.email)) return res.status(409).json({ error: "A user with this email already exists." });
  const user = users.create(parsed.data.email, await bcrypt.hash(parsed.data.password, 12), parsed.data.role);
  tenants.addMember(req.currentTenant!.id, user.id, parsed.data.workspaceRole);
  res.status(201).json(publicUser(user));
});

systemRoutes.put("/users/:id", requireSuperAdmin, async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid user." });
  if (req.user?.id === req.params.id && parsed.data.role !== "super_admin") return res.status(409).json({ error: "You cannot remove your own super admin role." });
  const hash = parsed.data.password ? await bcrypt.hash(parsed.data.password, 12) : undefined;
  users.update(req.params.id, parsed.data.role, hash);
  res.json({ ok: true });
});

systemRoutes.delete("/users/:id", requireSuperAdmin, (req, res) => {
  if (req.user?.id === req.params.id) return res.status(409).json({ error: "You cannot delete your own user." });
  users.delete(req.params.id);
  res.status(204).end();
});

systemRoutes.post("/users/:id/impersonate", requireSuperAdmin, (req, res) => {
  const result = createImpersonationSession(req.params.id, req.user!.id);
  if (!result) return res.status(404).json({ error: "User cannot be impersonated." });
  setSessionCookie(res, result.token);
  res.json({ user: result.user, csrfToken: result.csrfToken, impersonator: result.impersonator, tenants: tenants.forUser(result.user.id).map(publicMembership) });
});

const channelSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  type: z.enum(["email", "pushover", "webhook", "discord", "slack", "telegram", "gotify", "ntfy", "teams", "mattermost", "matrix", "pagerduty", "opsgenie"]),
  enabled: z.boolean().default(true),
  config: z.record(z.unknown()).default({})
});

const alertingSchema = z.object({
  resendAfterHours: z.number().int().min(1).max(720),
  recoveryEnabled: z.boolean(),
  certificateChangeAlerts: z.boolean().default(true),
  dnsChangeAlerts: z.boolean().default(false),
  tlsDeteriorationAlerts: z.boolean().default(true),
  tlsDeteriorationThreshold: z.number().int().min(1).max(50).default(5),
  quietHoursEnabled: z.boolean(),
  quietStart: z.string().regex(/^\d{2}:\d{2}$/),
  quietEnd: z.string().regex(/^\d{2}:\d{2}$/),
  quietSuppressCritical: z.boolean(),
  flappingThreshold: z.number().int().min(2).max(20).default(4)
});

const retentionSchema = z.object({
  checkResultsDays: z.number().int().min(1).max(3650),
  alertHistoryDays: z.number().int().min(1).max(3650)
});

const routeSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  tags: z.array(z.string().min(1).max(40)),
  severities: z.array(z.enum(["info", "warning", "critical", "recovery"])),
  channelIds: z.array(z.string()),
  recipients: z.record(z.string().max(2000)).default({}),
  delayMinutes: z.number().int().min(0).max(10_080).default(0),
  enabled: z.boolean()
});

const memberSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  role: z.enum(["owner", "admin", "member", "viewer"]).default("viewer")
});

const updateMemberSchema = z.object({
  role: z.enum(["owner", "admin", "member", "viewer"]).optional(),
  groupIds: z.array(z.string().uuid()).optional()
});

const groupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.enum(["owner", "admin", "member", "viewer"]).default("viewer"),
  memberIds: z.array(z.string().uuid()).default([])
});

const userAlertSchema = z.object({
  enabled: z.boolean(),
  tags: z.array(z.string().trim().min(1).max(40)).default([]),
  severities: z.array(z.enum(["info", "warning", "recovery"])).default(["warning", "recovery"]),
  channelIds: z.array(z.string().uuid()).default([]),
  recipients: z.record(z.string().max(2000)).default({})
});

const ctWatchSchema = z.object({
  enabled: z.boolean(),
  domains: z.array(z.string().trim().min(1).max(253)).default([]),
  lastSeen: z.record(z.string()).default({})
});

const discoverSchema = z.object({
  domain: z.string().trim().min(1).max(253)
});

const userSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(12, "Password must be at least 12 characters long."),
  role: z.enum(["super_admin", "admin", "viewer"]).default("viewer"),
  workspaceRole: z.enum(["owner", "admin", "member", "viewer"]).default("viewer")
});

const updateUserSchema = z.object({
  password: z.string().min(12).optional().or(z.literal("")),
  role: z.enum(["super_admin", "admin", "viewer"])
}).transform((value) => ({ ...value, password: value.password || undefined }));

const platformSchema = z.object({
  publicRegistrationEnabled: z.boolean()
});

const smtpSchema = z.object({
  host: z.string().max(255),
  port: z.number().int().min(1).max(65535),
  username: z.string().max(255),
  password: z.string().max(1000),
  from: z.string().max(255),
  secure: z.boolean(),
  starttls: z.boolean()
});

const redactConfig = (config: object) =>
  Object.fromEntries(Object.entries(config ?? {}).map(([key, value]) =>
    /pass|token|secret|key/i.test(key) ? [key, value ? "********" : ""] : [key, value]
  ));

const mergeMaskedConfig = (previous: Record<string, unknown>, next: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(next).map(([key, value]) => [
    key,
    value === "********" ? previous?.[key] : value
  ]));

const redactChannel = (channel: any) => ({
  ...channel,
  config: redactConfig(channel.config)
});

const publicUser = (user: any) => ({ id: user.id, email: user.email, role: user.role, createdAt: user.createdAt });
const publicMembership = (membership: any) => ({ tenantId: membership.tenantId, role: membership.effectiveRole ?? membership.role, directRole: membership.role, groupIds: membership.groupIds ?? [], groupNames: membership.groupNames ?? [], tenant: membership.tenant });
const publicMember = (membership: any) => ({ userId: membership.userId, email: membership.userEmail, role: membership.role, effectiveRole: membership.effectiveRole ?? membership.role, groupIds: membership.groupIds ?? [], groupNames: membership.groupNames ?? [], createdAt: membership.createdAt });
const publicInvite = (invite: any) => ({
  id: invite.id,
  tenantId: invite.tenantId,
  email: invite.email,
  role: invite.role,
  expiresAt: invite.expiresAt,
  createdAt: invite.createdAt,
  inviteUrl: `${env.baseUrl.replace(/\/$/, "")}/?invite=${encodeURIComponent(invite.token)}`
});

const canAssignRole = (req: any, role: string) => role !== "owner" || req.tenantRole === "owner";

const checkCtWatch = async (tenantId: string) => {
  const settings = appSettings.ctWatch(tenantId);
  const next = { ...settings, lastSeen: { ...settings.lastSeen } };
  const changes: Array<{ domain: string; newest: string; previous: string }> = [];
  if (!settings.enabled) return { enabled: false, changes };
  for (const domain of settings.domains) {
    const entries = await fetchCtEntries(domain);
    const newest = entries[0]?.id ?? "";
    if (newest && settings.lastSeen[domain] && settings.lastSeen[domain] !== newest) changes.push({ domain, newest, previous: settings.lastSeen[domain] });
    if (newest) next.lastSeen[domain] = newest;
  }
  appSettings.set("ctWatch", next, tenantId);
  return { enabled: true, changes, lastSeen: next.lastSeen };
};

const fetchCtEntries = async (domain: string) => {
  const response = await fetch(`https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`);
  if (!response.ok) return [];
  const data = await response.json().catch(() => []);
  return Array.isArray(data) ? data.map((item: any) => ({ id: String(item.id ?? ""), name: String(item.name_value ?? ""), notBefore: String(item.not_before ?? "") })).sort((a, b) => b.id.localeCompare(a.id)) : [];
};
