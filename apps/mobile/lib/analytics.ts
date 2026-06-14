import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

import type { AppRouter } from "@workspace/api/root";

import { getStoredLocale, getToken } from "./session";

function getApiUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
}

/**
 * A standalone vanilla tRPC client for fire-and-forget analytics calls.
 * Lazy-initialised to avoid running during module evaluation before the
 * session store is ready.
 */
let _client: ReturnType<typeof createTRPCClient<AppRouter>> | null = null;

function getClient(): ReturnType<typeof createTRPCClient<AppRouter>> {
  if (!_client) {
    _client = createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${getApiUrl()}/api/trpc`,
          transformer: superjson,
          headers: async () => {
            const [token, locale] = await Promise.all([getToken(), getStoredLocale()]);
            return {
              ...(token ? { authorization: `Bearer ${token}` } : {}),
              ...(locale ? { "x-locale": locale } : {}),
            };
          },
        }),
      ],
    });
  }
  return _client;
}

/**
 * Fire-and-forget conversion tracking. Never throws — safe to call anywhere
 * without wrapping in try/catch.
 */
export function track(
  event: "begin_checkout",
  params?: { value?: number; currency?: string; itemCount?: number },
): void {
  getClient()
    .analytics.track.mutate({ event, ...params })
    .catch(() => {
      // swallow — analytics must never crash the app
    });
}
