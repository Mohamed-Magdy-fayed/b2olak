import "server-only";

import { Redis } from "@upstash/redis";

/**
 * Lazy Upstash Redis client — sessions, rate limiting, and short-TTL caches.
 * Lazy so the app boots without env vars until something actually needs Redis.
 */

let _redis: Redis | undefined;

export function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. Copy .env.example to apps/web/.env and fill them in.",
      );
    }
    _redis = new Redis({ url, token });
  }
  return _redis;
}

/** Read-through cache helper for hot, cheap-to-stale reads (catalog lists). */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<T> {
  // Dev fallback: no Upstash configured → skip caching, hit the loader.
  if (
    !process.env.UPSTASH_REDIS_REST_URL &&
    process.env.NODE_ENV !== "production"
  ) {
    return load();
  }
  const redis = getRedis();
  const hit = await redis.get<T>(key);
  if (hit !== null && hit !== undefined) return hit;
  const value = await load();
  await redis.set(key, value, { ex: ttlSeconds });
  return value;
}

export async function invalidate(...keys: string[]) {
  if (keys.length === 0) return;
  await getRedis().del(...keys);
}
