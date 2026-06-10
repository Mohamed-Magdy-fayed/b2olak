import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import z, { ZodError } from "zod";

import { db } from "@workspace/db/client";
import {
  DEFAULT_LOCALE,
  dictionaries,
  FALLBACK_LOCALE,
  isLocale,
  type Locale,
} from "@workspace/i18n/dictionaries";
import { createI18n, LOCALE_COOKIE_NAME } from "@workspace/i18n/lib";

/**
 * tRPC context shared by web (cookie session) and mobile (bearer session).
 * Session resolution lands in Phase 3 — until then `session` is always null.
 */

export type Session = null; // replaced with the Redis session type in Phase 3

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
  const session: Session = null;

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

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const baseProcedure = t.procedure;
// protectedProcedure / customerProcedure / driverProcedure / adminProcedure → Phase 3
