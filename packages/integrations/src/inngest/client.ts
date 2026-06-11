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
};

export const inngest = new Inngest({
  id: "ba2olak",
  schemas: new EventSchemas().fromRecord<Events>(),
  // Dev targets the local dev server (npx inngest-cli dev) and skips cloud
  // auth — this also silences signing-key errors from empty env vars.
  isDev: process.env.NODE_ENV !== "production",
});
