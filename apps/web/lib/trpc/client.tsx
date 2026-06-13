"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import type { AppRouter } from "@workspace/api/root";

// The combined AppRouter type is large enough that letting TS infer the type
// of these exports trips TS7056 ("inferred type exceeds maximum length").
// Annotating the intermediate explicitly — as TS7056 itself recommends — keeps
// the exports fully typed without any `any`.
type TRPCContext = ReturnType<typeof createTRPCContext<AppRouter>>;
const trpcContext: TRPCContext = createTRPCContext<AppRouter>();
export const TRPCProvider: TRPCContext["TRPCProvider"] =
  trpcContext.TRPCProvider;
export const useTRPC: TRPCContext["useTRPC"] = trpcContext.useTRPC;

function getUrl() {
  if (typeof window !== "undefined") return "/api/trpc";
  return `http://localhost:${process.env.PORT ?? 3000}/api/trpc`;
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      }),
  );
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [httpBatchLink({ url: getUrl(), transformer: superjson })],
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
