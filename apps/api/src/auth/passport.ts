import bcrypt from "bcryptjs";
import type { Request } from "express";
import type { Profile } from "passport-github2";
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as LocalStrategy } from "passport-local";
import { env } from "../config/env.js";
import { sessions, users } from "../storage/repositories.js";
import type { User } from "../types.js";
import { randomToken } from "./tokens.js";

export const configurePassport = () => {
  passport.use(new LocalStrategy({ usernameField: "email", passwordField: "password" }, async (email, password, done) => {
    try {
      const user = users.findByEmail(email);
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) return done(null, false);
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  if (env.githubClientId && env.githubClientSecret) {
    passport.use(new GitHubStrategy({
      clientID: env.githubClientId,
      clientSecret: env.githubClientSecret,
      callbackURL: env.githubCallbackUrl,
      scope: ["user:email"]
    }, (_accessToken: string, _refreshToken: string, profile: Profile, done: (error: unknown, user?: unknown) => void) => {
      done(null, profile);
    }));
  }

  return passport.initialize();
};

export const authenticateLocal = (req: Request) =>
  new Promise<User | null>((resolve, reject) => {
    passport.authenticate("local", { session: false }, (error: unknown, user?: User | false) => {
      if (error) return reject(error);
      resolve(user || null);
    })(req);
  });

export const createUserSession = (userId: string, impersonatorUserId?: string | null) => {
  const token = randomToken(32);
  const csrfToken = randomToken(24);
  sessions.create(userId, token, csrfToken, impersonatorUserId ?? undefined);
  return { token, csrfToken };
};
