import "server-only";

import crypto from "node:crypto";
import { z } from "zod";

import { getRedis } from "@workspace/integrations/redis";

/**
 * Redis-backed sessions — ported from the reference app, adapted so the session
 * id can arrive via the web cookie OR a mobile `Authorization: Bearer` header.
 * Web cookie writing stays in apps/web (server actions own the cookie store).
 */

export const SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const COOKIE_SESSION_KEY = "session-id";

export const sessionUserSchema = z.object({
  id: z.string(),
  role: z.enum(["admin", "customer", "driver"]),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  preferredLocale: z.enum(["en", "ar"]),
});

export const sessionSchema = z.object({
  sessionId: z.string(),
  exp: z.number(),
  user: sessionUserSchema,
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
export type Session = z.infer<typeof sessionSchema>;

function sessionExpirationEpoch() {
  return Math.floor(Date.now() / 1000) + SESSION_EXPIRATION_SECONDS;
}

/** Cookie (web) takes priority, then bearer token (mobile). */
export function getSessionIdFromHeaders(headers: Headers): string | null {
  const cookie = headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${COOKIE_SESSION_KEY}=([^;]+)`));
  if (match?.[1]) return decodeURIComponent(match[1]);

  const authorization = headers.get("authorization") ?? "";
  if (authorization.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice(7).trim();
    if (token.length > 0) return token;
  }

  return null;
}

export async function getSessionById(
  sessionId: string,
): Promise<Session | null> {
  const raw = await getRedis().get(`session:${sessionId}`);
  const { success, data } = sessionSchema.safeParse(raw);
  if (!success) return null;
  if (data.exp * 1000 <= Date.now()) return null;
  return data;
}

export async function getSessionFromHeaders(
  headers: Headers,
): Promise<Session | null> {
  const sessionId = getSessionIdFromHeaders(headers);
  if (sessionId == null) return null;
  return getSessionById(sessionId);
}

export async function createSession(user: SessionUser): Promise<Session> {
  const sessionId = crypto.randomBytes(64).toString("hex").normalize();
  const session = sessionSchema.parse({
    sessionId,
    exp: sessionExpirationEpoch(),
    user,
  });
  const redis = getRedis();
  await redis.set(`session:${sessionId}`, session, {
    ex: SESSION_EXPIRATION_SECONDS,
  });
  // user → sessions index, so role changes/suspensions can revoke everything
  await redis.sadd(`user-sessions:${user.id}`, sessionId);
  await redis.expire(`user-sessions:${user.id}`, SESSION_EXPIRATION_SECONDS);
  return session;
}

/** Revoke every session of a user — on role change or suspension. */
export async function deleteAllSessionsForUser(userId: string) {
  const redis = getRedis();
  const sessionIds = await redis.smembers(`user-sessions:${userId}`);
  if (sessionIds.length > 0) {
    await redis.del(...sessionIds.map((id) => `session:${id}`));
  }
  await redis.del(`user-sessions:${userId}`);
}

/** Sliding renewal + refresh of the embedded user snapshot. */
export async function updateSessionUser(sessionId: string, user: SessionUser) {
  const existing = await getSessionById(sessionId);
  if (existing == null) return;
  await getRedis().set(
    `session:${sessionId}`,
    sessionSchema.parse({ sessionId, exp: sessionExpirationEpoch(), user }),
    { ex: SESSION_EXPIRATION_SECONDS },
  );
}

export async function deleteSession(sessionId: string) {
  await getRedis().del(`session:${sessionId}`);
}
