import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { TRPCError } from "@trpc/server";

import { getRedis } from "@workspace/integrations/redis";

/**
 * Sliding-window rate limits (docs/06-security.md §3).
 * Dev fallback: if Upstash env is missing outside production, limits are
 * skipped so local development works without an account.
 */

type Window = `${number} ${"s" | "m" | "h"}`;

const limiters = new Map<string, Ratelimit>();

function getLimiter(name: string, tokens: number, window: Window): Ratelimit {
  const key = `${name}:${tokens}:${window}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix: `rl:${name}`,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

export async function enforceRateLimit(
  name: string,
  identifier: string,
  tokens: number,
  window: Window,
) {
  if (
    !process.env.UPSTASH_REDIS_REST_URL &&
    process.env.NODE_ENV !== "production"
  ) {
    return;
  }

  const { success } = await getLimiter(name, tokens, window).limit(identifier);
  if (!success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "errors.tooManyRequests",
    });
  }
}

export function ipFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
