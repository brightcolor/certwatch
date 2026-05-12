import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { sessions, users } from "../storage/repositories.js";
import type { User } from "../types.js";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      csrfToken?: string;
    }
  }
}

const cookieName = "certwatch_session";

export const login = async (email: string, password: string) => {
  const user = users.findByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
  const token = randomBytes(32).toString("hex");
  const csrfToken = randomBytes(24).toString("hex");
  sessions.create(user.id, token, csrfToken);
  return { token, csrfToken, user: publicUser(user) };
};

export const attachSession = (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.[cookieName];
  if (!token) return next();
  const session = sessions.find(token);
  if (!session) return next();
  const user = users.findById(session.user_id);
  if (user) {
    req.user = user;
    req.csrfToken = session.csrf_token;
  }
  next();
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required." });
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.get("x-csrf-token") !== req.csrfToken) {
    return res.status(403).json({ error: "Invalid CSRF token." });
  }
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin role required." });
  next();
};

export const setSessionCookie = (res: Response, token: string) => {
  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.cookieSecure,
    maxAge: 1000 * 60 * 60 * 24 * 14
  });
};

export const clearSessionCookie = (req: Request, res: Response) => {
  const token = req.cookies?.[cookieName];
  if (token) sessions.delete(token);
  res.clearCookie(cookieName);
};

export const publicUser = (user: User) => ({ id: user.id, email: user.email, role: user.role });
