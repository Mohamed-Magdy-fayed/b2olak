import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import * as crypto from "node:crypto";

import { createOtp, verifyOtp } from "@workspace/auth/otp";
import {
  createSession,
  deleteAllSessionsForUser,
  deleteSession,
  type SessionUser,
  updateSessionUser,
} from "@workspace/auth/session";
import {
  authenticateWithPasskey,
  authenticationResponseSchema,
  createPasskeyAuthenticationOptions,
  createPasskeyRegistrationOptions,
  getRelyingPartyFromEnv,
  registerPasskey,
  registrationResponseSchema,
} from "@workspace/auth/webauthn";
import { UserDevicesTable } from "@workspace/db/schemas/auth/user-devices";
import { UserPasskeysTable } from "@workspace/db/schemas/auth/user-passkeys";
import { UserTokensTable } from "@workspace/db/schemas/auth/user-tokens";
import { UsersTable } from "@workspace/db/schemas/auth/users";
import { inngest } from "@workspace/integrations/inngest/client";
import { getWhatsAppConfig } from "@workspace/integrations/whatsapp/config";
import {
  sendWhatsAppMessage,
} from "@workspace/integrations/whatsapp/send";
import {
  egyptianPhoneSchema,
  otpCodeSchema,
  requestOtpSchema,
  setNotificationChannelSchema,
  updateProfileSchema,
  verifyOtpSchema,
} from "@workspace/validators/auth";

import { z } from "zod";

import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "../init";
import { enforceRateLimit, ipFromHeaders } from "../ratelimit";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function otpMessage(code: string, locale: "en" | "ar") {
  return locale === "ar"
    ? `كود الدخول لتطبيق بقولك: ${code}\nصالح لمدة ١٠ دقائق. لا تشاركه مع أي حد.`
    : `Your ba2olak sign-in code: ${code}\nValid for 10 minutes. Never share it.`;
}

function toSessionUser(user: typeof UsersTable.$inferSelect): SessionUser {
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    phone: user.phone,
    email: user.email,
    preferredLocale: user.preferredLocale,
  };
}

export const authRouter = createTRPCRouter({
  /**
   * Phone-first entry point for customers/drivers. Creates a customer account
   * for unknown phones; behaves identically either way (no enumeration).
   */
  requestOtp: baseProcedure
    .input(requestOtpSchema)
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("otp-send", input.phone, 3, "15 m");
      await enforceRateLimit("otp-send-ip", ipFromHeaders(ctx.headers), 10, "15 m");

      let user = await ctx.db.query.UsersTable.findFirst({
        where: and(
          eq(UsersTable.phone, input.phone),
          isNull(UsersTable.deletedAt),
        ),
      });

      if (!user) {
        const [created] = await ctx.db
          .insert(UsersTable)
          .values({
            phone: input.phone,
            role: "customer",
            preferredLocale: ctx.locale,
            createdBy: "self-signup",
          })
          .returning();
        user = created;
      }

      // Suspended accounts get the same generic response but no OTP.
      if (user && user.status === "active") {
        const code = await createOtp(ctx.db, user.id);
        const whatsappConfig = await getWhatsAppConfig(ctx.db);
        await sendWhatsAppMessage(
          whatsappConfig,
          input.phone,
          otpMessage(code, user.preferredLocale),
          "otp:signin",
        );
      }

      return { ok: true as const };
    }),

  /** Verifies the OTP and returns the session id (mobile stores it as bearer). */
  verifyOtp: baseProcedure
    .input(verifyOtpSchema)
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("otp-verify", input.phone, 10, "15 m");

      const user = await ctx.db.query.UsersTable.findFirst({
        where: and(
          eq(UsersTable.phone, input.phone),
          isNull(UsersTable.deletedAt),
        ),
      });

      if (!user) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "auth.otpInvalid" });
      }
      if (user.status === "suspended") {
        throw new TRPCError({ code: "FORBIDDEN", message: "auth.suspended" });
      }

      const result = await verifyOtp(ctx.db, user.id, input.code);
      if (result !== "ok") {
        const message =
          result === "too_many_attempts"
            ? "auth.otpTooManyAttempts"
            : result === "expired"
              ? "auth.otpExpired"
              : "auth.otpInvalid";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }

      const now = new Date();
      await ctx.db
        .update(UsersTable)
        .set({
          phoneVerifiedAt: user.phoneVerifiedAt ?? now,
          lastSignInAt: now,
        })
        .where(eq(UsersTable.id, user.id));

      const session = await createSession(toSessionUser(user));

      try {
        await inngest.send({
          name: "auth/signed_in",
          data: {
            userId: user.id,
            role: user.role,
            signedInAt: new Date().toISOString(),
          },
        });
      } catch {
        // best-effort
      }

      return {
        sessionId: session.sessionId,
        user: session.user,
      };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.UsersTable.findFirst({
      where: and(
        eq(UsersTable.id, ctx.session.user.id),
        isNull(UsersTable.deletedAt),
      ),
      with: { driverProfile: true },
    });

    if (!user || user.status === "suspended") {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return {
      user: toSessionUser(user),
      driverProfile: user.driverProfile ?? null,
      notificationChannel: user.notificationChannel,
    };
  }),

  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(UsersTable)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.preferredLocale !== undefined
            ? { preferredLocale: input.preferredLocale }
            : {}),
          updatedBy: ctx.session.user.id,
        })
        .where(eq(UsersTable.id, ctx.session.user.id))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });

      await updateSessionUser(ctx.session.sessionId, toSessionUser(updated));

      return { user: toSessionUser(updated) };
    }),

  registerPushToken: protectedProcedure
    .input(z.object({ token: z.string().min(1).max(512) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(UsersTable)
        .set({ pushToken: input.token, updatedBy: ctx.session.user.id })
        .where(eq(UsersTable.id, ctx.session.user.id));
      return { ok: true as const };
    }),

  /**
   * Sets the user's order-update notification channel. When switching to
   * `push`, the client also passes the freshly-minted Expo token so it's stored
   * atomically with the channel change.
   */
  setNotificationChannel: protectedProcedure
    .input(setNotificationChannelSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(UsersTable)
        .set({
          notificationChannel: input.channel,
          ...(input.pushToken ? { pushToken: input.pushToken } : {}),
          updatedBy: ctx.session.user.id,
        })
        .where(eq(UsersTable.id, ctx.session.user.id));
      return { channel: input.channel };
    }),

  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.session.user.role === "customer") {
      try {
        await inngest.send({
          name: "customer/signed_out",
          data: { userId: ctx.session.user.id, signedOutAt: new Date().toISOString() },
        });
      } catch {
        // best-effort
      }
    }
    await deleteSession(ctx.session.sessionId);
    return { ok: true as const };
  }),

  /**
   * Phone linking for accounts created without a phone (e.g. Google OAuth on
   * web). Ordering requires a verified phone (scam prevention), so this is the
   * gate-opener for those accounts.
   */
  requestPhoneLink: protectedProcedure
    .input(z.object({ phone: egyptianPhoneSchema }))
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("otp-send", input.phone, 3, "15 m");
      await enforceRateLimit("otp-send-ip", ipFromHeaders(ctx.headers), 10, "15 m");

      const owner = await ctx.db.query.UsersTable.findFirst({
        where: and(
          eq(UsersTable.phone, input.phone),
          isNull(UsersTable.deletedAt),
        ),
      });
      if (owner && owner.id !== ctx.session.user.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "auth.phoneAlreadyInUse",
        });
      }

      const code = await createOtp(ctx.db, ctx.session.user.id);
      const whatsappConfig = await getWhatsAppConfig(ctx.db);
      await sendWhatsAppMessage(
        whatsappConfig,
        input.phone,
        otpMessage(code, ctx.session.user.preferredLocale),
        "otp:self",
      );

      return { ok: true as const };
    }),

  confirmPhoneLink: protectedProcedure
    .input(z.object({ phone: egyptianPhoneSchema, code: otpCodeSchema }))
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("otp-verify", input.phone, 10, "15 m");

      const owner = await ctx.db.query.UsersTable.findFirst({
        where: and(
          eq(UsersTable.phone, input.phone),
          isNull(UsersTable.deletedAt),
        ),
      });
      if (owner && owner.id !== ctx.session.user.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "auth.phoneAlreadyInUse",
        });
      }

      const result = await verifyOtp(ctx.db, ctx.session.user.id, input.code);
      if (result !== "ok") {
        const message =
          result === "too_many_attempts"
            ? "auth.otpTooManyAttempts"
            : result === "expired"
              ? "auth.otpExpired"
              : "auth.otpInvalid";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }

      const [updated] = await ctx.db
        .update(UsersTable)
        .set({
          phone: input.phone,
          phoneVerifiedAt: new Date(),
          updatedBy: ctx.session.user.id,
        })
        .where(eq(UsersTable.id, ctx.session.user.id))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });

      await updateSessionUser(ctx.session.sessionId, toSessionUser(updated));

      return { user: toSessionUser(updated) };
    }),

  /**
   * ── Passkeys (WebAuthn) ──────────────────────────────────────────────────
   * Convenience login on the web. The challenge embedded in the returned
   * options is persisted by the caller (apps/web stores it in a short-lived
   * httpOnly cookie) and replayed into the matching verify* procedure. The
   * cookie is server-trusted, so the client can't forge the expected challenge.
   */
  passkeyRegistrationOptions: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await ctx.db.query.UserPasskeysTable.findMany({
      where: and(
        eq(UserPasskeysTable.userId, ctx.session.user.id),
        isNull(UserPasskeysTable.deletedAt),
      ),
      columns: { credentialId: true, transports: true },
    });

    return createPasskeyRegistrationOptions({
      rp: getRelyingPartyFromEnv(),
      user: { id: ctx.session.user.id, name: ctx.session.user.name },
      existingPasskeys: existing,
    });
  }),

  verifyPasskeyRegistration: protectedProcedure
    .input(
      z.object({
        response: registrationResponseSchema,
        expectedChallenge: z.string(),
        label: z.string().max(64).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const passkey = await registerPasskey({
        db: ctx.db,
        rp: getRelyingPartyFromEnv(),
        userId: ctx.session.user.id,
        label: input.label,
        expectedChallenge: input.expectedChallenge,
        response: input.response,
      });

      if (!passkey) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "auth.passkey.enrollFailed",
        });
      }

      return {
        id: passkey.id,
        label: passkey.label,
        createdAt: passkey.createdAt,
      };
    }),

  /** Usernameless / discoverable-credential login — no allowCredentials. */
  passkeyAuthenticationOptions: baseProcedure.mutation(async () => {
    return createPasskeyAuthenticationOptions({ rp: getRelyingPartyFromEnv() });
  }),

  verifyPasskeyAuthentication: baseProcedure
    .input(
      z.object({
        response: authenticationResponseSchema,
        expectedChallenge: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const passkey = await authenticateWithPasskey({
        db: ctx.db,
        rp: getRelyingPartyFromEnv(),
        expectedChallenge: input.expectedChallenge,
        response: input.response,
      });
      if (!passkey) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "auth.passkey.loginFailed",
        });
      }

      const user = await ctx.db.query.UsersTable.findFirst({
        where: and(
          eq(UsersTable.id, passkey.userId),
          isNull(UsersTable.deletedAt),
        ),
      });
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "auth.passkey.loginFailed",
        });
      }
      if (user.status === "suspended") {
        throw new TRPCError({ code: "FORBIDDEN", message: "auth.suspended" });
      }

      await ctx.db
        .update(UsersTable)
        .set({ lastSignInAt: new Date() })
        .where(eq(UsersTable.id, user.id));

      const session = await createSession(toSessionUser(user));
      return { sessionId: session.sessionId, user: session.user };
    }),

  listPasskeys: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.UserPasskeysTable.findMany({
      where: and(
        eq(UserPasskeysTable.userId, ctx.session.user.id),
        isNull(UserPasskeysTable.deletedAt),
      ),
      columns: { id: true, label: true, createdAt: true, lastUsedAt: true },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }),

  deletePasskey: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(UserPasskeysTable)
        .set({ deletedAt: new Date(), updatedBy: ctx.session.user.id })
        .where(
          and(
            eq(UserPasskeysTable.id, input.id),
            eq(UserPasskeysTable.userId, ctx.session.user.id),
            isNull(UserPasskeysTable.deletedAt),
          ),
        );
      return { ok: true as const };
    }),

  renamePasskey: protectedProcedure
    .input(z.object({ id: z.uuid(), label: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(UserPasskeysTable)
        .set({ label: input.label, updatedBy: ctx.session.user.id })
        .where(
          and(
            eq(UserPasskeysTable.id, input.id),
            eq(UserPasskeysTable.userId, ctx.session.user.id),
            isNull(UserPasskeysTable.deletedAt),
          ),
        )
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return { ok: true as const };
    }),

  /**
   * ── Trusted-device biometric login ──────────────────────────────────────
   * Lets a mobile device re-authenticate without OTP by presenting a
   * device-bound secret that was issued at registration time.
   */

  /**
   * Register the current device as trusted. Returns a (deviceId, secret) pair
   * that the client must persist securely (e.g. in the device Keychain /
   * Keystore). The secret is returned exactly once and never stored in plain
   * text.
   */
  registerDevice: protectedProcedure
    .input(z.object({ label: z.string().max(64).optional() }))
    .mutation(async ({ ctx, input }) => {
      const deviceId = crypto.randomUUID();
      const secret = crypto.randomBytes(32).toString("hex");

      await ctx.db.insert(UserDevicesTable).values({
        userId: ctx.session.user.id,
        deviceId,
        secretHash: sha256(secret),
        label: input.label,
        createdBy: ctx.session.user.id,
      });

      return { deviceId, secret };
    }),

  /**
   * Exchange a (deviceId, secret) pair for a fresh session. Rate-limited on
   * both IP and deviceId to resist brute-force. Uses timing-safe comparison
   * to prevent hash-timing attacks.
   */
  deviceLogin: baseProcedure
    .input(
      z.object({
        deviceId: z.string().min(1).max(128),
        secret: z.string().min(1).max(256),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("device-login-ip", ipFromHeaders(ctx.headers), 20, "15 m");
      await enforceRateLimit("device-login", input.deviceId, 10, "15 m");

      const device = await ctx.db.query.UserDevicesTable.findFirst({
        where: eq(UserDevicesTable.deviceId, input.deviceId),
      });

      if (!device) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "auth.deviceLoginFailed" });
      }

      // Timing-safe comparison — guard against unequal buffer lengths (timingSafeEqual
      // throws if the two Buffers differ in byte length).
      const candidateHash = sha256(input.secret);
      const candidateBuf = Buffer.from(candidateHash, "utf8");
      const storedBuf = Buffer.from(device.secretHash, "utf8");
      const match =
        candidateBuf.length === storedBuf.length &&
        crypto.timingSafeEqual(candidateBuf, storedBuf);

      if (!match) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "auth.deviceLoginFailed" });
      }

      const user = await ctx.db.query.UsersTable.findFirst({
        where: and(
          eq(UsersTable.id, device.userId),
          isNull(UsersTable.deletedAt),
        ),
      });

      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "auth.deviceLoginFailed" });
      }
      if (user.status === "suspended") {
        throw new TRPCError({ code: "FORBIDDEN", message: "auth.suspended" });
      }

      const now = new Date();
      await ctx.db
        .update(UserDevicesTable)
        .set({ lastUsedAt: now })
        .where(eq(UserDevicesTable.id, device.id));

      await ctx.db
        .update(UsersTable)
        .set({ lastSignInAt: now })
        .where(eq(UsersTable.id, user.id));

      const session = await createSession(toSessionUser(user));

      try {
        await inngest.send({
          name: "auth/signed_in",
          data: {
            userId: user.id,
            role: user.role,
            signedInAt: new Date().toISOString(),
          },
        });
      } catch {
        // best-effort
      }

      return { sessionId: session.sessionId, user: session.user };
    }),

  /**
   * List the calling user's trusted devices for the auth manager. The secret
   * hash is never exposed — only display metadata.
   */
  listDevices: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.UserDevicesTable.findMany({
      where: eq(UserDevicesTable.userId, ctx.session.user.id),
      columns: { deviceId: true, label: true, createdAt: true, lastUsedAt: true },
      orderBy: (t, { desc }) => [desc(t.lastUsedAt), desc(t.createdAt)],
    });
  }),

  /**
   * Revoke a trusted device. Only the owning user can revoke their own devices.
   */
  revokeDevice: protectedProcedure
    .input(z.object({ deviceId: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(UserDevicesTable)
        .where(
          and(
            eq(UserDevicesTable.deviceId, input.deviceId),
            eq(UserDevicesTable.userId, ctx.session.user.id),
          ),
        );

      return { ok: true as const };
    }),

  /**
   * Sign out of every session for the calling user (this device included).
   * Trusted devices and passkeys are kept — only live sessions are revoked.
   */
  signOutEverywhere: protectedProcedure.mutation(async ({ ctx }) => {
    await deleteAllSessionsForUser(ctx.session.user.id);
    return { ok: true as const };
  }),

  /**
   * Permanently anonymize the calling user's account.
   * - PII (name, phone, email, image, push token) is cleared.
   * - All sessions, OTP tokens, trusted devices, and passkeys are revoked.
   * - Order rows are retained for accounting (per privacy policy).
   * Required by Google Play and App Store for apps with account creation.
   */
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    await deleteAllSessionsForUser(userId);

    await ctx.db
      .delete(UserDevicesTable)
      .where(eq(UserDevicesTable.userId, userId));

    await ctx.db
      .update(UserPasskeysTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(UserPasskeysTable.userId, userId),
          isNull(UserPasskeysTable.deletedAt),
        ),
      );

    await ctx.db
      .delete(UserTokensTable)
      .where(eq(UserTokensTable.userId, userId));

    await ctx.db
      .update(UsersTable)
      .set({
        name: null,
        phone: null,
        email: null,
        imageUrl: null,
        pushToken: null,
        deletedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(UsersTable.id, userId));

    return { ok: true as const };
  }),
});
