import "server-only";

import { EventSchemas, Inngest } from "inngest";

type Events = {
  "catalog/item.created": {
    data: { itemId: string };
  };
  "order/status.changed": {
    data: {
      orderId: string;
      fromStatus: string | null;
      toStatus: string;
    };
  };
  "customer/signed_out": {
    data: { userId: string; signedOutAt: string };
  };
  "auth/signed_in": {
    data: { userId: string; role: string; signedInAt: string };
  };
  "checkout/started": {
    data: { userId?: string; value: number; currency: string; itemCount: number };
  };
  "order/placed": {
    data: { orderId: string; userId: string; value: number; currency: string };
  };
  "wallet/credited": {
    data: { userId: string; orderId: string; amount: number };
  };
};

export const inngest = new Inngest({
  id: "ba2olak",
  schemas: new EventSchemas().fromRecord<Events>(),
  // Dev targets the local dev server (npx inngest-cli dev) and skips cloud
  // auth — this also silences signing-key errors from empty env vars.
  isDev: process.env.NODE_ENV !== "production",
});
