import "server-only";

import crypto from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import type { Db } from "@workspace/db/client";
import { UserTokensTable } from "@workspace/db/schemas/auth/user-tokens";

/**
 * Password reset codes — phone-first: 6 digits delivered over WhatsApp,
 * same hashing/expiry/attempt rules as the sign-in OTP (docs/06-security.md).
 * Only staff accounts hold passwords, so this is a staff-recovery flow.
 */

const RESET_EXPIRY_SECONDS = 60 * 10;
const RESET_MAX_ATTEMPTS = 5;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetCode(
  db: Db,
  userId: string,
): Promise<string> {
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

  await db
    .update(UserTokensTable)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(UserTokensTable.userId, userId),
        eq(UserTokensTable.type, "password_reset"),
        isNull(UserTokensTable.consumedAt),
      ),
    );

  await db.insert(UserTokensTable).values({
    userId,
    type: "password_reset",
    hashedToken: hashToken(code),
    expiresAt: new Date(Date.now() + RESET_EXPIRY_SECONDS * 1000),
  });

  return code;
}

export type ResetVerifyResult =
  | "ok"
  | "invalid"
  | "expired"
  | "too_many_attempts";

export async function verifyPasswordResetCode(
  db: Db,
  userId: string,
  code: string,
): Promise<ResetVerifyResult> {
  const token = await db.query.UserTokensTable.findFirst({
    where: and(
      eq(UserTokensTable.userId, userId),
      eq(UserTokensTable.type, "password_reset"),
      isNull(UserTokensTable.consumedAt),
      gt(UserTokensTable.expiresAt, new Date()),
    ),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  if (!token) return "expired";
  if (token.attempts >= RESET_MAX_ATTEMPTS) return "too_many_attempts";

  const matches = crypto.timingSafeEqual(
    Buffer.from(hashToken(code), "hex"),
    Buffer.from(token.hashedToken, "hex"),
  );

  if (!matches) {
    await db
      .update(UserTokensTable)
      .set({ attempts: token.attempts + 1 })
      .where(eq(UserTokensTable.id, token.id));
    return token.attempts + 1 >= RESET_MAX_ATTEMPTS
      ? "too_many_attempts"
      : "invalid";
  }

  await db
    .update(UserTokensTable)
    .set({ consumedAt: new Date() })
    .where(eq(UserTokensTable.id, token.id));

  return "ok";
}
