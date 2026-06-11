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
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(`tRPC error on ${path ?? "<no-path>"}:`, error);
          }
        : undefined,
  });

export { handler as GET, handler as POST };
