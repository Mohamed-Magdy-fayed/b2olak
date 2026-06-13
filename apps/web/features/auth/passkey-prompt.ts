import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@workspace/db/client";
import { UserPasskeysTable } from "@workspace/db/schemas/auth/user-passkeys";

import { postAuthPath, sanitizeNextPath } from "./lib";
import { hasSeenPasskeyPrompt } from "./passkey-cookies";

/**
 * Decides where to land a user right after sign-in. Customers with no passkey
 * who haven't seen the prompt are routed once through the `/secure` enrollment
 * interstitial (which carries the real destination in `next`); everyone else
 * goes straight to their normal post-auth path.
 */
export async function resolvePostLoginPath(args: {
  userId: string;
  role: "admin" | "customer" | "driver";
  next?: string | null;
}): Promise<string> {
  const target = postAuthPath(args.role, args.next);
  if (args.role !== "customer") return target;

  if (await hasSeenPasskeyPrompt()) return target;

  const existing = await db.query.UserPasskeysTable.findFirst({
    where: and(
      eq(UserPasskeysTable.userId, args.userId),
      isNull(UserPasskeysTable.deletedAt),
    ),
    columns: { id: true },
  });
  if (existing) return target;

  const safeTarget = sanitizeNextPath(target) ?? "/shop";
  return `/secure?next=${encodeURIComponent(safeTarget)}`;
}
