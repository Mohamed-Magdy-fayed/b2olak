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
  { id: "order-status-changed", retries: 2 },
  { event: "order/status.changed" },
  async ({ event, step }) => {
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
    const to = event.data.toStatus;

    if (to === "placed") {
      await step.run("notify-ops", async () => {
        const setting = await db.query.SystemSettingsTable.findFirst({
          where: eq(SystemSettingsTable.key, "support_whatsapp_number"),
        });
        const opsNumber = (setting?.value as { value?: string } | null)?.value;
        if (opsNumber) {
          await sendWhatsAppMessage(whatsappConfig, opsNumber, opsMessages.placed(info));
        }
      });
      await step.run("notify-customer", async () => {
        const locale = order.customer.preferredLocale;
        await Promise.all([
          order.customer.phone
            ? sendWhatsAppMessage(
                whatsappConfig,
                order.customer.phone,
                customerMessages.placed(info, locale),
              )
            : null,
          sendExpoPush(order.customer.pushToken, pushCustomer("placed", info, locale)),
        ]);
      });
      return { ok: true as const };
    }

    if (to === "assigned") {
      await step.run("notify-driver", async () => {
        const locale = order.driver?.preferredLocale ?? "ar";
        await Promise.all([
          order.driver?.phone
            ? sendWhatsAppMessage(
                whatsappConfig,
                order.driver.phone,
                driverMessages.assigned(info, locale),
              )
            : null,
          sendExpoPush(order.driver?.pushToken, pushDriver("assigned", info, locale)),
        ]);
      });
      await step.run("notify-customer", async () => {
        const locale = order.customer.preferredLocale;
        await Promise.all([
          order.customer.phone
            ? sendWhatsAppMessage(
                whatsappConfig,
                order.customer.phone,
                customerMessages.assigned(info, locale),
              )
            : null,
          sendExpoPush(order.customer.pushToken, pushCustomer("assigned", info, locale)),
        ]);
      });
      return { ok: true as const };
    }

    if (to === "shopping" || to === "purchased") {
      await step.run("notify-customer", () =>
        sendExpoPush(
          order.customer.pushToken,
          pushCustomer(to, info, order.customer.preferredLocale),
        ),
      );
      return { ok: true as const };
    }

    if (to === "delivering" || to === "delivered") {
      await step.run("notify-customer", async () => {
        const locale = order.customer.preferredLocale;
        await Promise.all([
          order.customer.phone
            ? sendWhatsAppMessage(
                whatsappConfig,
                order.customer.phone,
                customerMessages[to](info, locale),
              )
            : null,
          sendExpoPush(order.customer.pushToken, pushCustomer(to, info, locale)),
        ]);
      });
      return { ok: true as const };
    }

    if (to === "cancelled") {
      await step.run("notify-customer", async () => {
        const locale = order.customer.preferredLocale;
        await Promise.all([
          order.customer.phone
            ? sendWhatsAppMessage(
                whatsappConfig,
                order.customer.phone,
                customerMessages.cancelled(info, locale),
              )
            : null,
          sendExpoPush(order.customer.pushToken, pushCustomer("cancelled", info, locale)),
        ]);
      });
      if (order.driver) {
        await step.run("notify-driver", async () => {
          const locale = order.driver!.preferredLocale;
          await Promise.all([
            order.driver?.phone
              ? sendWhatsAppMessage(
                  whatsappConfig,
                  order.driver.phone!,
                  driverMessages.cancelled(info, locale),
                )
              : null,
            sendExpoPush(order.driver?.pushToken, pushDriver("cancelled", info, locale)),
          ]);
        });
      }
      return { ok: true as const };
    }

    return { ok: true as const };
  },
);
