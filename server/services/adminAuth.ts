import type { NextFunction, Request, Response } from "express";

type AdminSession = {
  token: string;
  createdAt: number;
  expiresAt: number;
};

const sessionTtlMs = 8 * 60 * 60 * 1000;

export function createAdminAuth() {
  const sessions = new Map<string, AdminSession>();
  const adminId = process.env.ADMIN_ID ?? "admin";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin";

  function login(username: string, password: string) {
    cleanup();

    if (username !== adminId || password !== adminPassword) {
      return null;
    }

    const now = Date.now();
    const session: AdminSession = {
      token: crypto.randomUUID(),
      createdAt: now,
      expiresAt: now + sessionTtlMs
    };
    sessions.set(session.token, session);
    return session;
  }

  function isValid(token: string | undefined) {
    cleanup();
    if (!token) {
      return false;
    }

    const session = sessions.get(token);
    return Boolean(session && session.expiresAt > Date.now());
  }

  function requireAdmin(request: Request, response: Response, next: NextFunction) {
    const token = Array.isArray(request.headers["x-admin-token"])
      ? request.headers["x-admin-token"][0]
      : request.headers["x-admin-token"];

    if (!isValid(token)) {
      response.status(401).json({ error: "Admin login is required" });
      return;
    }

    next();
  }

  function cleanup() {
    const now = Date.now();
    sessions.forEach((session, token) => {
      if (session.expiresAt <= now) {
        sessions.delete(token);
      }
    });
  }

  return {
    isValid,
    login,
    requireAdmin
  };
}
