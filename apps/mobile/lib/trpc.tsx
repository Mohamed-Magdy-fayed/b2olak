import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import type { AppRouter } from "@workspace/api/root";

import { getStoredLocale, getToken } from "./session";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

/**
 * API base URL. localhost works on emulators/simulators with `expo start`;
 * a physical device needs your machine's LAN IP in apps/mobile/.env.
 */
export function getApiUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
}

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
  );
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${getApiUrl()}/api/trpc`,
          transformer: superjson,
          headers: async () => {
            const [token, locale] = await Promise.all([
              getToken(),
              getStoredLocale(),
            ]);
            return {
              ...(token ? { authorization: `Bearer ${token}` } : {}),
              ...(locale ? { "x-locale": locale } : {}),
            };
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
