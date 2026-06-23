"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";

import { createCallerFactory, createTRPCContext } from "@workspace/api/init";
import { appRouter } from "@workspace/api/root";
import { enforceRateLimit, ipFromHeaders } from "@workspace/api/ratelimit";
import { createGoogleOAuthClient } from "@workspace/auth/oauth";
import { comparePasswords } from "@workspace/auth/password-hasher";
import {
  COOKIE_SESSION_KEY,
  createSession,
  deleteSession,
  SESSION_EXPIRATION_SECONDS,
} from "@workspace/auth/session";
import { db } from "@workspace/db/client";
import { UsersTable } from "@workspace/db/schemas/auth/users";
import {
  requestOtpSchema,
  signInPasswordSchema,
  verifyOtpSchema,
} from "@workspace/validators/auth";

import { OAUTH_NEXT_COOKIE_KEY, sanitizeNextPath } from "./lib";
import { resolvePostLoginPath } from "./passkey-prompt";

export type SignInState = { error: string } | undefined;

async function setSessionCookie(sessionId: string) {
  const store = await cookies();
  store.set(COOKIE_SESSION_KEY, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + SESSION_EXPIRATION_SECONDS * 1000),
  });
}

async function apiCaller() {
  const ctx = await createTRPCContext({ headers: await headers() });
  return createCallerFactory(appRouter)(ctx);
}

/** Maps thrown tRPC errors to dictionary keys the form can t(). */
function errorKeyFrom(error: unknown): string {
  if (error instanceof TRPCError) {
    if (error.code === "TOO_MANY_REQUESTS") return "errors.tooManyRequests";
    if (error.message.includes(".")) return error.message;
  }
  return "errors.unknown";
}

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

  await setSessionCookie(session.sessionId);

  redirect(user.role === "admin" ? "/admin" : "/");
}

export type OtpFormState =
  | { phase: "phone"; error?: string }
  | { phase: "code"; phone: string; error?: string }
  | undefined;

/** Step 1 of customer sign-in: send the WhatsApp code. */
export async function requestOtpAction(
  _prev: OtpFormState,
  formData: FormData,
): Promise<OtpFormState> {
  const parsed = requestOtpSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) {
    return { phase: "phone", error: "validation.phoneInvalid" };
  }

  try {
    const caller = await apiCaller();
    await caller.auth.requestOtp({ phone: parsed.data.phone });
    return { phase: "code", phone: parsed.data.phone };
  } catch (error) {
    // A non-mapped error here means the code couldn't be sent (e.g. WhatsApp/SMS
    // provider rejected it) — surface that rather than the generic "unknown".
    const key = errorKeyFrom(error);
    return {
      phase: "phone",
      error: key === "errors.unknown" ? "auth.otpSendFailed" : key,
    };
  }
}

/** Step 2: verify the code, mint the cookie session, land role-aware. */
export async function verifyOtpAction(
  _prev: OtpFormState,
  formData: FormData,
): Promise<OtpFormState> {
  const parsed = verifyOtpSchema.safeParse({
    phone: formData.get("phone"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return {
      phase: "code",
      phone: String(formData.get("phone") ?? ""),
      error: "validation.otpInvalid",
    };
  }

  let target: string;
  try {
    const caller = await apiCaller();
    const result = await caller.auth.verifyOtp(parsed.data);
    await setSessionCookie(result.sessionId);
    target = await resolvePostLoginPath({
      userId: result.user.id,
      role: result.user.role,
      next: sanitizeNextPath(formData.get("next") as string),
    });
  } catch (error) {
    return { phase: "code", phone: parsed.data.phone, error: errorKeyFrom(error) };
  }

  redirect(target);
}

/** Kicks off the Google OAuth flow (PKCE state cookies + provider redirect). */
export async function signInWithGoogleAction(formData: FormData) {
  const store = await cookies();
  const next = sanitizeNextPath(formData.get("next") as string);
  if (next) {
    store.set(OAUTH_NEXT_COOKIE_KEY, next, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(Date.now() + 10 * 60 * 1000),
    });
  }
  const url = createGoogleOAuthClient().createAuthUrl(store);
  redirect(url);
}

export async function signOutAction() {
  const store = await cookies();
  const sessionId = store.get(COOKIE_SESSION_KEY)?.value;
  if (sessionId) await deleteSession(sessionId);
  store.delete(COOKIE_SESSION_KEY);
  redirect("/");
}
