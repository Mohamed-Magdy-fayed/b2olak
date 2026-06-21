import "server-only";

import crypto from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import type { Db } from "@workspace/db/client";
import { UserTokensTable } from "@workspace/db/schemas/auth/user-tokens";

/**
 * WhatsApp OTP — 6 digits, 10-minute expiry, max 5 attempts, stored hashed.
 * docs/06-security.md. Send-rate limiting lives in the API layer.
 */

const OTP_EXPIRY_SECONDS = 60 * 10;
const OTP_MAX_ATTEMPTS = 5;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function createOtp(db: Db, userId: string): Promise<string> {
  const code = generateOtpCode();

  // Invalidate previous outstanding OTPs — only the latest code is valid.
  await db
    .update(UserTokensTable)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(UserTokensTable.userId, userId),
        eq(UserTokensTable.type, "whatsapp_otp"),
        isNull(UserTokensTable.consumedAt),
      ),
    );

  await db.insert(UserTokensTable).values({
    userId,
    type: "whatsapp_otp",
    hashedToken: hashToken(code),
    expiresAt: new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000),
  });

  return code;
}

export type OtpVerifyResult = "ok" | "invalid" | "expired" | "too_many_attempts";

export async function verifyOtp(
  db: Db,
  userId: string,
  code: string,
): Promise<OtpVerifyResult> {
  const token = await db.query.UserTokensTable.findFirst({
    where: and(
      eq(UserTokensTable.userId, userId),
      eq(UserTokensTable.type, "whatsapp_otp"),
      isNull(UserTokensTable.consumedAt),
      gt(UserTokensTable.expiresAt, new Date()),
    ),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  if (!token) return "expired";
  if (token.attempts >= OTP_MAX_ATTEMPTS) return "too_many_attempts";

  const matches = crypto.timingSafeEqual(
    Buffer.from(hashToken(code), "hex"),
    Buffer.from(token.hashedToken, "hex"),
  );

  if (!matches) {
    await db
      .update(UserTokensTable)
      .set({ attempts: token.attempts + 1 })
      .where(eq(UserTokensTable.id, token.id));
    return token.attempts + 1 >= OTP_MAX_ATTEMPTS
      ? "too_many_attempts"
      : "invalid";
  }

  await db
    .update(UserTokensTable)
    .set({ consumedAt: new Date() })
    .where(eq(UserTokensTable.id, token.id));

  return "ok";
}
