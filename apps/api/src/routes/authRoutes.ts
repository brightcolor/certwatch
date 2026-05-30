import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { clearSessionCookie, login, publicUser, requireAuth, setSessionCookie } from "../auth/auth.js";
import { env } from "../config/env.js";
import { tenantInvites, tenants, users } from "../storage/repositories.js";

export const authRoutes = Router();

authRoutes.get("/setup-status", (_req, res) => {
  res.json({ setupRequired: users.count() === 0 });
});

authRoutes.get("/config", (_req, res) => {
  res.json({
    setupRequired: users.count() === 0,
    frontPageEnabled: env.frontPageEnabled,
    publicRegistrationEnabled: env.publicRegistrationEnabled
  });
});

authRoutes.post("/setup", async (req, res) => {
  if (users.count() > 0) return res.status(409).json({ error: "Setup has already been completed." });
  const body = z.object({
    email: z.string().email(),
    password: z.string().min(12, "Password must be at least 12 characters long."),
    organizationName: z.string().trim().min(2).max(120).optional().or(z.literal(""))
  }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.issues[0]?.message ?? "Invalid setup payload." });
  const passwordHash = await bcrypt.hash(body.data.password, 12);
  const user = users.create(body.data.email, passwordHash, "admin");
  tenants.create(body.data.organizationName || "Default workspace", user.id);
  const result = await login(user.email, body.data.password);
  if (!result) return res.status(500).json({ error: "Admin user was created, but automatic login failed." });
  setSessionCookie(res, result.token);
  res.status(201).json(withMemberships(result.user, result.csrfToken, user.id));
});

authRoutes.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid registration payload." });

  const firstUser = users.count() === 0;
  const invite = parsed.data.inviteToken ? tenantInvites.findByToken(parsed.data.inviteToken) : null;
  if (parsed.data.inviteToken && !invite) return res.status(404).json({ error: "Invitation is invalid or expired." });
  if (!firstUser && !invite && !env.publicRegistrationEnabled) return res.status(403).json({ error: "Public registration is disabled." });
  if (invite && invite.email !== parsed.data.email) return res.status(409).json({ error: "This invitation was issued for a different email address." });
  if (!invite && !parsed.data.organizationName) return res.status(400).json({ error: "Organization name is required." });
  if (users.findByEmail(parsed.data.email)) return res.status(409).json({ error: "A user with this email already exists. Sign in instead." });
  if (invite && !workspaceHasRoom(invite.tenantId)) return res.status(402).json({ error: "Workspace user limit reached." });

  const role = firstUser ? "admin" : "viewer";
  const user = users.create(parsed.data.email, await bcrypt.hash(parsed.data.password, 12), role);
  if (invite) tenantInvites.accept(invite, user.id);
  else tenants.create(parsed.data.organizationName!, user.id);

  const result = await login(user.email, parsed.data.password);
  if (!result) return res.status(500).json({ error: "User was created, but automatic login failed." });
  setSessionCookie(res, result.token);
  res.status(201).json(withMemberships(result.user, result.csrfToken, user.id));
});

authRoutes.post("/login", async (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid credentials payload." });
  const result = await login(body.data.email, body.data.password);
  if (!result) return res.status(401).json({ error: "Invalid email or password." });
  setSessionCookie(res, result.token);
  res.json(withMemberships(result.user, result.csrfToken, result.user.id));
});

authRoutes.post("/logout", requireAuth, (req, res) => {
  clearSessionCookie(req, res);
  res.json({ ok: true });
});

authRoutes.get("/me", requireAuth, (req, res) => {
  res.json(withMemberships(publicUser(req.user!), req.csrfToken, req.user!.id));
});

const withMemberships = (user: ReturnType<typeof publicUser>, csrfToken: string | undefined, userId: string) => ({
  user,
  csrfToken,
  tenants: tenants.forUser(userId).map(publicMembership)
});

const publicMembership = (membership: any) => ({
  tenantId: membership.tenantId,
  role: membership.effectiveRole ?? membership.role,
  directRole: membership.role,
  groupIds: membership.groupIds ?? [],
  groupNames: membership.groupNames ?? [],
  tenant: membership.tenant
});

const registerSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(12, "Password must be at least 12 characters long."),
  organizationName: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  inviteToken: z.string().trim().min(8).optional().or(z.literal(""))
}).transform((value) => ({
  ...value,
  organizationName: value.organizationName || undefined,
  inviteToken: value.inviteToken || undefined
}));

const workspaceHasRoom = (tenantId: string) => {
  const tenant = tenants.get(tenantId);
  return !tenant || tenant.userLimit <= 0 || tenants.members(tenant.id).length < tenant.userLimit;
};
