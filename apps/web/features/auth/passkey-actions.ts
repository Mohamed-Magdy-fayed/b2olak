"use server";

import { cookies, headers } from "next/headers";
import { TRPCError } from "@trpc/server";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";

import { createCallerFactory, createTRPCContext } from "@workspace/api/init";
import { appRouter } from "@workspace/api/root";
import {
  COOKIE_SESSION_KEY,
  SESSION_EXPIRATION_SECONDS,
} from "@workspace/auth/session";

import { postAuthPath, sanitizeNextPath } from "./lib";
import {
  markPasskeyPromptSeen,
  readAndClearPasskeyChallenge,
  setPasskeyChallenge,
} from "./passkey-cookies";

/**
 * Passkey (WebAuthn) ceremonies for the web. The tRPC procedures hold the pure
 * logic; these server actions own the cookie I/O — the per-ceremony challenge
 * (httpOnly, single-use) and, on login, the session cookie. The browser runs
 * the actual ceremony between each start/finish pair via @simplewebauthn/browser.
 */

async function apiCaller() {
  const ctx = await createTRPCContext({ headers: await headers() });
  return createCallerFactory(appRouter)(ctx);
}

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

function errorKeyFrom(error: unknown, fallback: string): string {
  if (error instanceof TRPCError) {
    if (error.code === "TOO_MANY_REQUESTS") return "errors.tooManyRequests";
    if (error.message.includes(".")) return error.message;
  }
  return fallback;
}

export type PasskeyActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ── Enrollment (authenticated user adds a passkey) ──────────────────────────

export async function startPasskeyEnrollment(): Promise<
  PasskeyActionResult<PublicKeyCredentialCreationOptionsJSON>
> {
  try {
    const caller = await apiCaller();
    const options = await caller.auth.passkeyRegistrationOptions();
    await setPasskeyChallenge(options.challenge);
    return { ok: true, data: options };
  } catch (error) {
    return { ok: false, error: errorKeyFrom(error, "auth.passkey.enrollFailed") };
  }
}

export async function finishPasskeyEnrollment(
  response: RegistrationResponseJSON,
  label?: string,
): Promise<PasskeyActionResult<{ id: string }>> {
  const expectedChallenge = await readAndClearPasskeyChallenge();
  if (!expectedChallenge) {
    return { ok: false, error: "auth.passkey.enrollFailed" };
  }
  try {
    const caller = await apiCaller();
    const result = await caller.auth.verifyPasskeyRegistration({
      response,
      expectedChallenge,
      label,
    });
    return { ok: true, data: { id: result.id } };
  } catch (error) {
    return { ok: false, error: errorKeyFrom(error, "auth.passkey.enrollFailed") };
  }
}

// ── Login (no session yet — discoverable credential) ────────────────────────

export async function startPasskeyLogin(): Promise<
  PasskeyActionResult<PublicKeyCredentialRequestOptionsJSON>
> {
  try {
    const caller = await apiCaller();
    const options = await caller.auth.passkeyAuthenticationOptions();
    await setPasskeyChallenge(options.challenge);
    return { ok: true, data: options };
  } catch (error) {
    return { ok: false, error: errorKeyFrom(error, "auth.passkey.loginFailed") };
  }
}

export async function finishPasskeyLogin(
  response: AuthenticationResponseJSON,
  next?: string | null,
): Promise<PasskeyActionResult<{ redirectTo: string }>> {
  const expectedChallenge = await readAndClearPasskeyChallenge();
  if (!expectedChallenge) {
    return { ok: false, error: "auth.passkey.loginFailed" };
  }
  try {
    const caller = await apiCaller();
    const result = await caller.auth.verifyPasskeyAuthentication({
      response,
      expectedChallenge,
    });
    await setSessionCookie(result.sessionId);
    return {
      ok: true,
      data: { redirectTo: postAuthPath(result.user.role, sanitizeNextPath(next)) },
    };
  } catch (error) {
    return { ok: false, error: errorKeyFrom(error, "auth.passkey.loginFailed") };
  }
}

/** Records that the one-time enrollment prompt was handled (skip or enroll). */
export async function dismissPasskeyPrompt() {
  await markPasskeyPromptSeen();
  return { ok: true as const };
}
