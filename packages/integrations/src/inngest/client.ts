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
});
