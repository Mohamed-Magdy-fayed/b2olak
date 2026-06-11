import { eq } from "drizzle-orm";

import { db } from "@workspace/db/client";
import { OrdersTable } from "@workspace/db/schemas/orders/orders";
import { SystemSettingsTable } from "@workspace/db/schemas/system/system-settings";

import { sendWhatsAppText } from "../../whatsapp/send";
import {
  customerMessages,
  driverMessages,
  opsMessages,
} from "../../whatsapp/templates";
import { inngest } from "../client";

/** WhatsApp pings per order event (docs/01-journeys notification matrices). */
export const onOrderStatusChanged = inngest.createFunction(
  { id: "order-status-changed", retries: 2 },
  { event: "order/status.changed" },
  async ({ event, step }) => {
    const order = await step.run("load-order", () =>
      db.query.OrdersTable.findFirst({
        where: eq(OrdersTable.id, event.data.orderId),
        with: {
          customer: { columns: { phone: true, name: true, preferredLocale: true } },
          driver: { columns: { phone: true, name: true, preferredLocale: true } },
          items: { columns: { id: true } },
        },
      }),
    );
    if (!order) return { skipped: true as const };

    const info = {
      orderNumber: order.orderNumber,
      area: order.area,
      itemsCount: order.items.length,
      codTotal: order.codTotal,
      driverName: order.driver?.name,
      cancelReason: order.cancelReason,
    };
    const to = event.data.toStatus;

    if (to === "placed") {
      await step.run("notify-ops", async () => {
        const setting = await db.query.SystemSettingsTable.findFirst({
          where: eq(SystemSettingsTable.key, "support_whatsapp_number"),
        });
        const opsNumber = (setting?.value as { value?: string } | null)?.value;
        if (opsNumber) await sendWhatsAppText(opsNumber, opsMessages.placed(info));
      });
      if (order.customer.phone) {
        await step.run("notify-customer", () =>
          sendWhatsAppText(
            order.customer.phone!,
            customerMessages.placed(info, order.customer.preferredLocale),
          ),
        );
      }
      return { ok: true as const };
    }

    if (to === "assigned") {
      if (order.driver?.phone) {
        await step.run("notify-driver", () =>
          sendWhatsAppText(
            order.driver!.phone!,
            driverMessages.assigned(info, order.driver!.preferredLocale),
          ),
        );
      }
      if (order.customer.phone) {
        await step.run("notify-customer", () =>
          sendWhatsAppText(
            order.customer.phone!,
            customerMessages.assigned(info, order.customer.preferredLocale),
          ),
        );
      }
      return { ok: true as const };
    }

    if (to === "delivering" || to === "delivered") {
      if (order.customer.phone) {
        await step.run("notify-customer", () =>
          sendWhatsAppText(
            order.customer.phone!,
            customerMessages[to](info, order.customer.preferredLocale),
          ),
        );
      }
      return { ok: true as const };
    }

    if (to === "cancelled") {
      if (order.customer.phone) {
        await step.run("notify-customer", () =>
          sendWhatsAppText(
            order.customer.phone!,
            customerMessages.cancelled(info, order.customer.preferredLocale),
          ),
        );
      }
      if (order.driver?.phone) {
        await step.run("notify-driver", () =>
          sendWhatsAppText(
            order.driver!.phone!,
            driverMessages.cancelled(info, order.driver!.preferredLocale),
          ),
        );
      }
      return { ok: true as const };
    }

    return { ok: true as const }; // shopping/purchased — no pings
  },
);
