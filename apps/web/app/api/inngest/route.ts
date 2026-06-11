import { serve } from "inngest/next";

import { inngest } from "@workspace/integrations/inngest/client";
import { inngestFunctions } from "@workspace/integrations/inngest/functions/index";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
  // empty-string env vars must not be treated as keys
  signingKey: process.env.INNGEST_SIGNING_KEY || undefined,
});
