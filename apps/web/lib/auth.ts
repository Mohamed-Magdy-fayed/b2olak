import { cookies } from "next/headers";

import {
  COOKIE_SESSION_KEY,
  getSessionById,
  type Session,
} from "@workspace/auth/session";

/** RSC/server-action session helper (web cookie transport). */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const sessionId = store.get(COOKIE_SESSION_KEY)?.value;
  if (!sessionId) return null;
  return getSessionById(sessionId);
}
