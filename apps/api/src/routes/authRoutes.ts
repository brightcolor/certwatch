import { Router } from "express";
import { z } from "zod";
import { clearSessionCookie, login, publicUser, requireAuth, setSessionCookie } from "../auth/auth.js";

export const authRoutes = Router();

authRoutes.post("/login", async (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid credentials payload." });
  const result = await login(body.data.email, body.data.password);
  if (!result) return res.status(401).json({ error: "Invalid email or password." });
  setSessionCookie(res, result.token);
  res.json({ user: result.user, csrfToken: result.csrfToken });
});

authRoutes.post("/logout", requireAuth, (req, res) => {
  clearSessionCookie(req, res);
  res.json({ ok: true });
});

authRoutes.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user!), csrfToken: req.csrfToken });
});
