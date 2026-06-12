import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";

import { createOtp, verifyOtp } from "@workspace/auth/otp";
import {
  createSession,
  deleteSession,
  type SessionUser,
  updateSessionUser,
} from "@workspace/auth/session";
import { UsersTable } from "@workspace/db/schemas/auth/users";
import { getWhatsAppConfig } from "@workspace/integrations/whatsapp/config";
import {
  sendWhatsAppMessage,
} from "@workspace/integrations/whatsapp/send";
import {
  requestOtpSchema,
  updateProfileSchema,
  verifyOtpSchema,
} from "@workspace/validators/auth";

import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "../init";
import { enforceRateLimit, ipFromHeaders } from "../ratelimit";

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

  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    await deleteSession(ctx.session.sessionId);
    return { ok: true as const };
  }),
});
