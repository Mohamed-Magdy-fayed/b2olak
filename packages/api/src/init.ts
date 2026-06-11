import { initTRPC, TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import superjson from "superjson";
import z, { ZodError } from "zod";

import { getSessionFromHeaders, type Session } from "@workspace/auth/session";
import { db } from "@workspace/db/client";
import { DriverProfilesTable } from "@workspace/db/schemas/drivers/driver-profiles";
import {
  DEFAULT_LOCALE,
  dictionaries,
  FALLBACK_LOCALE,
  isLocale,
  type Locale,
} from "@workspace/i18n/dictionaries";
import { createI18n, LOCALE_COOKIE_NAME } from "@workspace/i18n/lib";

/**
 * tRPC context shared by web (cookie session) and mobile (bearer session) —
 * session resolution handles both transports in @workspace/auth.
 */

function localeFromHeaders(headers: Headers): Locale {
  const explicit = headers.get("x-locale");
  if (isLocale(explicit)) return explicit;
  const cookie = headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${LOCALE_COOKIE_NAME}=([^;]+)`));
  const fromCookie = match?.[1] ? decodeURIComponent(match[1]) : undefined;
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE;
}

export const createTRPCContext = async ({ headers }: { headers: Headers }) => {
  const locale = localeFromHeaders(headers);
  const { t } = createI18n(dictionaries, locale, FALLBACK_LOCALE);
  const session: Session | null = await getSessionFromHeaders(headers);

  return { session, headers, locale, t, db };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? z.treeifyError(error.cause) : null,
      },
    };
  },
});

const authMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.session || ctx.session.exp * 1000 <= Date.now()) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: { session: ctx.session },
  });
});

function roleMiddleware(role: "admin" | "customer" | "driver") {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.session || ctx.session.exp * 1000 <= Date.now()) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    if (ctx.session.user.role !== role) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx: { session: ctx.session } });
  });
}

/** Drivers must also hold an approved driver profile (docs/01-journeys/driver.md D1). */
const approvedDriverMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });

  const profile = await ctx.db.query.DriverProfilesTable.findFirst({
    where: eq(DriverProfilesTable.userId, ctx.session.user.id),
  });

  if (!profile || profile.status !== "approved") {
    throw new TRPCError({ code: "FORBIDDEN", message: "auth.driverNotApproved" });
  }

  return next({ ctx: { session: ctx.session, driverProfile: profile } });
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const baseProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(authMiddleware);
export const adminProcedure = t.procedure.use(roleMiddleware("admin"));
export const customerProcedure = t.procedure.use(roleMiddleware("customer"));
export const driverProcedure = t.procedure
  .use(roleMiddleware("driver"))
  .use(approvedDriverMiddleware);
