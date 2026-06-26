import { eq } from "drizzle-orm";

import { db } from "@workspace/db/client";
import { OrdersTable } from "@workspace/db/schemas/orders/orders";
import { SystemSettingsTable } from "@workspace/db/schemas/system/system-settings";

import { sendExpoPush } from "../../expo/push";
import { getWhatsAppConfig } from "../../whatsapp/config";
import { sendWhatsAppMessage } from "../../whatsapp/send";
import {
  customerMessages,
  driverMessages,
  opsMessages,
} from "../../whatsapp/templates";
import { inngest } from "../client";

type Locale = "en" | "ar";

function pushCustomer(
  status: string,
  info: { orderNumber: number; driverName?: string | null; cancelReason?: string | null },
  locale: Locale,
): { title: string; body: string } {
  const n = `#${info.orderNumber}`;
  if (status === "placed")
    return locale === "ar"
      ? { title: "تم استلام طلبك", body: `طلب ${n} قيد المعالجة` }
      : { title: "Order Received", body: `Order ${n} is being processed` };
  if (status === "assigned")
    return locale === "ar"
      ? { title: "تم تعيين طيّار", body: `${info.driverName ?? "طيّارك"} في الطريق` }
      : { title: "Driver Assigned", body: `${info.driverName ?? "Your driver"} is on the way` };
  if (status === "shopping")
    return locale === "ar"
      ? { title: "طيّارك يتسوّق الآن", body: `طلب ${n}` }
      : { title: "Driver is Shopping", body: `Order ${n}` };
  if (status === "purchased")
    return locale === "ar"
      ? { title: "تم الشراء", body: "طيّارك في طريقه إليك" }
      : { title: "Shopping Complete", body: "Your driver is heading to you" };
  if (status === "delivering")
    return locale === "ar"
      ? { title: "طيّارك في الطريق إليك", body: `طلب ${n}` }
      : { title: "On the Way", body: `Order ${n}` };
  if (status === "delivered")
    return locale === "ar"
      ? { title: "تم التوصيل", body: "شكراً لاستخدامك بقولك" }
      : { title: "Order Delivered", body: "Thank you for using ba2olak" };
  if (status === "cancelled")
    return locale === "ar"
      ? { title: "تم إلغاء الطلب", body: info.cancelReason ?? `طلب ${n}` }
      : { title: "Order Cancelled", body: info.cancelReason ?? `Order ${n}` };
  return { title: "", body: "" };
}

function pushDriver(
  status: string,
  info: { orderNumber: number; area: string; itemsCount: number },
  locale: Locale,
): { title: string; body: string } {
  const n = `#${info.orderNumber}`;
  if (status === "assigned")
    return locale === "ar"
      ? { title: "طلب جديد", body: `${info.area} — ${info.itemsCount} أصناف` }
      : { title: "New Order", body: `${info.area} — ${info.itemsCount} items` };
  if (status === "cancelled")
    return locale === "ar"
      ? { title: "إلغاء طلب", body: `طلب ${n} تم إلغاؤه` }
      : { title: "Order Cancelled", body: `Order ${n} was cancelled` };
  return { title: "", body: "" };
}

/** In-app push + WhatsApp pings per order event. */
export const onOrderStatusChanged = inngest.createFunction(
  {
    id: "order-status-changed",
    retries: 2,
    // Serialize notifications per order. Without this, two fast status changes
    // run in parallel and their WhatsApp/push sends race — the customer can see
    // "On the way" before "Driver assigned". limit:1 keyed on the order makes
    // Inngest process one transition's notifications at a time, in enqueue
    // order; since the status machine gates transitions (B can't be sent until
    // A commits), enqueue order is already the correct order.
    concurrency: { limit: 1, key: "event.data.orderId" },
  },
  { event: "order/status.changed" },
  async ({ event, step, attempt }) => {
    const orderId = event.data.orderId;
    const to = event.data.toStatus;
    // Each external side-effect below lives in its OWN step.run so a failure in
    // one (e.g. an expired push token, or Wapilot returning a non-2xx after it
    // already delivered) can never re-run a sibling. Without this isolation, a
    // single combined step that threw would retry and re-send WhatsApp — the
    // cause of customers receiving the same message multiple times. `attempt`
    // is logged so duplicate deliveries can be traced to Inngest retries.
    console.info(
      `[order-status-changed] order=${orderId} -> ${to} attempt=${attempt}`,
    );
    const whatsappConfig = await getWhatsAppConfig(db);

    const order = await step.run("load-order", () =>
      db.query.OrdersTable.findFirst({
        where: eq(OrdersTable.id, event.data.orderId),
        with: {
          customer: {
            columns: {
              phone: true,
              name: true,
              preferredLocale: true,
              pushToken: true,
            },
          },
          driver: {
            columns: {
              phone: true,
              name: true,
              preferredLocale: true,
              pushToken: true,
            },
          },
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
    const customerLocale = order.customer.preferredLocale;
    const driverLocale = order.driver?.preferredLocale ?? "ar";

    // One isolated step per side-effect. Each is memoized once it succeeds, so a
    // later failure (or a retry of the function) never re-sends an already-sent
    // message. WhatsApp sends carry a correlation label; pushes carry the
    // orderId so a tap can deep-link to the order.
    const customerWhatsApp = (text: string) =>
      order.customer.phone
        ? step.run("notify-customer-whatsapp", () =>
            sendWhatsAppMessage(
              whatsappConfig,
              order.customer.phone!,
              text,
              `order:${orderId}:${to}`,
            ),
          )
        : Promise.resolve();

    const customerPush = (payload: { title: string; body: string }) =>
      step.run("notify-customer-push", () =>
        sendExpoPush(order.customer.pushToken, { ...payload, data: { orderId } }),
      );

    const driverWhatsApp = (text: string) =>
      order.driver?.phone
        ? step.run("notify-driver-whatsapp", () =>
            sendWhatsAppMessage(
              whatsappConfig,
              order.driver!.phone!,
              text,
              `order:${orderId}:${to}:driver`,
            ),
          )
        : Promise.resolve();

    const driverPush = (payload: { title: string; body: string }) =>
      step.run("notify-driver-push", () =>
        sendExpoPush(order.driver?.pushToken, { ...payload, data: { orderId } }),
      );

    if (to === "placed") {
      await step.run("notify-ops", async () => {
        const setting = await db.query.SystemSettingsTable.findFirst({
          where: eq(SystemSettingsTable.key, "support_whatsapp_number"),
        });
        const opsNumber = (setting?.value as { value?: string } | null)?.value;
        if (opsNumber) {
          await sendWhatsAppMessage(
            whatsappConfig,
            opsNumber,
            opsMessages.placed(info),
            `order:${orderId}:placed:ops`,
          );
        }
      });
      await customerWhatsApp(customerMessages.placed(info, customerLocale));
      await customerPush(pushCustomer("placed", info, customerLocale));
      return { ok: true as const };
    }

    if (to === "assigned") {
      await driverWhatsApp(driverMessages.assigned(info, driverLocale));
      await driverPush(pushDriver("assigned", info, driverLocale));
      await customerWhatsApp(customerMessages.assigned(info, customerLocale));
      await customerPush(pushCustomer("assigned", info, customerLocale));
      return { ok: true as const };
    }

    if (to === "shopping" || to === "purchased") {
      await customerPush(pushCustomer(to, info, customerLocale));
      return { ok: true as const };
    }

    if (to === "delivering" || to === "delivered") {
      await customerWhatsApp(customerMessages[to](info, customerLocale));
      await customerPush(pushCustomer(to, info, customerLocale));
      return { ok: true as const };
    }

    if (to === "cancelled") {
      await customerWhatsApp(customerMessages.cancelled(info, customerLocale));
      await customerPush(pushCustomer("cancelled", info, customerLocale));
      if (order.driver) {
        await driverWhatsApp(driverMessages.cancelled(info, driverLocale));
        await driverPush(pushDriver("cancelled", info, driverLocale));
      }
      return { ok: true as const };
    }

    return { ok: true as const };
  },
);
