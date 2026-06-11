"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";

import { enforceRateLimit, ipFromHeaders } from "@workspace/api/ratelimit";
import { comparePasswords } from "@workspace/auth/password-hasher";
import {
  COOKIE_SESSION_KEY,
  createSession,
  deleteSession,
  SESSION_EXPIRATION_SECONDS,
} from "@workspace/auth/session";
import { db } from "@workspace/db/client";
import { UsersTable } from "@workspace/db/schemas/auth/users";
import { signInPasswordSchema } from "@workspace/validators/auth";

export type SignInState = { error: string } | undefined;

export async function signInAdminAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = signInPasswordSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "auth.invalidCredentials" };

  const { email, password } = parsed.data;

  try {
    const ip = ipFromHeaders(await headers());
    await enforceRateLimit("signin", `${ip}:${email.toLowerCase()}`, 5, "1 m");
  } catch {
    return { error: "errors.tooManyRequests" };
  }

  const user = await db.query.UsersTable.findFirst({
    where: and(
      eq(UsersTable.email, email.toLowerCase()),
      isNull(UsersTable.deletedAt),
    ),
    with: { credentials: true },
  });

  // Generic error in all failure cases — no account enumeration.
  if (!user?.credentials || user.status !== "active") {
    return { error: "auth.invalidCredentials" };
  }

  const valid = await comparePasswords({
    password,
    salt: user.credentials.salt,
    hashedPassword: user.credentials.passwordHash,
  });
  if (!valid) return { error: "auth.invalidCredentials" };

  await db
    .update(UsersTable)
    .set({ lastSignInAt: new Date() })
    .where(eq(UsersTable.id, user.id));

  const session = await createSession({
    id: user.id,
    role: user.role,
    name: user.name,
    phone: user.phone,
    email: user.email,
    preferredLocale: user.preferredLocale,
  });

  const store = await cookies();
  store.set(COOKIE_SESSION_KEY, session.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + SESSION_EXPIRATION_SECONDS * 1000),
  });

  redirect("/");
}

export async function signOutAction() {
  const store = await cookies();
  const sessionId = store.get(COOKIE_SESSION_KEY)?.value;
  if (sessionId) await deleteSession(sessionId);
  store.delete(COOKIE_SESSION_KEY);
  redirect("/");
}
