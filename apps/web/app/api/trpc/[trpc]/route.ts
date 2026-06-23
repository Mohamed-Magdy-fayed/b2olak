import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createTRPCContext } from "@workspace/api/init";
import { appRouter } from "@workspace/api/root";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    // authed API responses must never be cached (docs/06-security.md)
    responseMeta: () => ({
      headers: { "cache-control": "no-store" },
    }),
    // Log server errors in every environment — production was previously silent,
    // which made 200-with-error-body failures (e.g. OTP send) impossible to debug.
    onError: ({ path, error }) => {
      console.error(`tRPC error on ${path ?? "<no-path>"}:`, error);
    },
  });

export { handler as GET, handler as POST };
