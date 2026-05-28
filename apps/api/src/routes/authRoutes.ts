import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { clearSessionCookie, login, publicUser, requireAuth, setSessionCookie } from "../auth/auth.js";
import { tenants, users } from "../storage/repositories.js";

export const authRoutes = Router();

authRoutes.get("/setup-status", (_req, res) => {
  res.json({ setupRequired: users.count() === 0 });
});

authRoutes.post("/setup", async (req, res) => {
  if (users.count() > 0) return res.status(409).json({ error: "Setup has already been completed." });
  const body = z.object({
    email: z.string().email(),
    password: z.string().min(12, "Password must be at least 12 characters long.")
  }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.issues[0]?.message ?? "Invalid setup payload." });
  const passwordHash = await bcrypt.hash(body.data.password, 12);
  const user = users.createAdmin(body.data.email, passwordHash);
  const result = await login(user.email, body.data.password);
  if (!result) return res.status(500).json({ error: "Admin user was created, but automatic login failed." });
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
  role: membership.role,
  tenant: membership.tenant
});
