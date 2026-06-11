/**
 * Bilingual WhatsApp notification templates (docs/01-journeys §notifications).
 * The recipient's preferredLocale picks the variant.
 */

type Locale = "en" | "ar";

type OrderInfo = {
  orderNumber: number;
  area: string;
  itemsCount: number;
  codTotal?: string | null;
  driverName?: string | null;
  cancelReason?: string | null;
};

export const customerMessages = {
  placed: (o: OrderInfo, l: Locale) =>
    l === "ar"
      ? `بقولك 🛵\nتم استلام طلبك رقم #${o.orderNumber} (${o.itemsCount} صنف).\nهنبلغك أول ما يتحرك!`
      : `ba2olak 🛵\nOrder #${o.orderNumber} received (${o.itemsCount} items).\nWe'll keep you posted!`,
  assigned: (o: OrderInfo, l: Locale) =>
    l === "ar"
      ? `بقولك 🛵\nالطيّار ${o.driverName ?? ""} استلم طلبك #${o.orderNumber} وهيبدأ قريب.`
      : `ba2olak 🛵\n${o.driverName ?? "A driver"} took your order #${o.orderNumber} and will start soon.`,
  delivering: (o: OrderInfo, l: Locale) =>
    l === "ar"
      ? `بقولك 🛵\nطلبك #${o.orderNumber} في الطريق إليك! جهّز ${o.codTotal ?? ""} جنيه كاش.`
      : `ba2olak 🛵\nOrder #${o.orderNumber} is on the way! Have ${o.codTotal ?? ""} EGP cash ready.`,
  delivered: (o: OrderInfo, l: Locale) =>
    l === "ar"
      ? `بقولك 💜\nتم توصيل طلبك #${o.orderNumber}. الإجمالي: ${o.codTotal ?? "-"} جنيه.\nشكراً ليك!`
      : `ba2olak 💜\nOrder #${o.orderNumber} delivered. Total: ${o.codTotal ?? "-"} EGP.\nThank you!`,
  cancelled: (o: OrderInfo, l: Locale) =>
    l === "ar"
      ? `بقولك\nتم إلغاء طلبك #${o.orderNumber}${o.cancelReason ? ` — ${o.cancelReason}` : ""}.`
      : `ba2olak\nYour order #${o.orderNumber} was cancelled${o.cancelReason ? ` — ${o.cancelReason}` : ""}.`,
};

export const driverMessages = {
  assigned: (o: OrderInfo, l: Locale) =>
    l === "ar"
      ? `بقولك 📦\nطلب جديد ليك: #${o.orderNumber} — ${o.area} (${o.itemsCount} صنف).\nافتح التطبيق وابدأ.`
      : `ba2olak 📦\nNew order for you: #${o.orderNumber} — ${o.area} (${o.itemsCount} items).\nOpen the app to start.`,
  cancelled: (o: OrderInfo, l: Locale) =>
    l === "ar"
      ? `بقولك\nالطلب #${o.orderNumber} اتلغى — أوقف التنفيذ.`
      : `ba2olak\nOrder #${o.orderNumber} was cancelled — stop fulfillment.`,
};

export const opsMessages = {
  placed: (o: OrderInfo) =>
    `ba2olak ops 📥\nطلب جديد #${o.orderNumber} — ${o.area} (${o.itemsCount} صنف). عيّن طيّار من اللوحة.`,
};
