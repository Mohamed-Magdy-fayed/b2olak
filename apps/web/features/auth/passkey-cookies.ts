import { cookies } from "next/headers";

/**
 * Short-lived httpOnly cookie that stores the WebAuthn challenge between the
 * "options" and "verify" halves of a passkey ceremony. The client never sees
 * it, so it can't forge the expected challenge — same trust model as the OAuth
 * state cookie (see packages/auth/src/oauth.ts).
 */
const CHALLENGE_COOKIE_KEY = "pkChallenge";
const CHALLENGE_EXPIRATION_SECONDS = 60 * 5;

export async function setPasskeyChallenge(challenge: string) {
  const store = await cookies();
  store.set(CHALLENGE_COOKIE_KEY, challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + CHALLENGE_EXPIRATION_SECONDS * 1000),
  });
}

/** Returns the stored challenge and clears it (single-use). */
export async function readAndClearPasskeyChallenge(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(CHALLENGE_COOKIE_KEY)?.value ?? null;
  if (value) store.delete(CHALLENGE_COOKIE_KEY);
  return value;
}

/**
 * Remembers that the user saw (and skipped or completed) the one-time passkey
 * enrollment prompt, so it's never shown again automatically — the account
 * Security page is the permanent re-offer surface.
 */
const PROMPT_SEEN_COOKIE_KEY = "pkPromptSeen";
const PROMPT_SEEN_EXPIRATION_SECONDS = 60 * 60 * 24 * 365;

export async function hasSeenPasskeyPrompt(): Promise<boolean> {
  const store = await cookies();
  return store.get(PROMPT_SEEN_COOKIE_KEY)?.value === "1";
}

export async function markPasskeyPromptSeen() {
  const store = await cookies();
  store.set(PROMPT_SEEN_COOKIE_KEY, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + PROMPT_SEEN_EXPIRATION_SECONDS * 1000),
  });
}
