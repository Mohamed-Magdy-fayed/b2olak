import { createHash, randomUUID } from "node:crypto";

import { inngest } from "../client";

// Maps our internal event names to standard/custom conversion event names
function toEventName(inngestEvent: string): string {
  switch (inngestEvent) {
    case "order/placed":
      return "Purchase";
    case "checkout/started":
      return "InitiateCheckout";
    case "auth/signed_in":
      return "SignIn";
    case "customer/signed_out":
      return "SignOut";
    default:
      return inngestEvent;
  }
}

// Converts a userId to a SHA-256 hex string (Meta external_id requirement)
function hashUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex");
}

/** Forward conversion events to Meta CAPI and GA4 Measurement Protocol. */
export const forwardConversion = inngest.createFunction(
  { id: "forward-conversion", retries: 2 },
  [
    { event: "order/placed" },
    { event: "checkout/started" },
    { event: "auth/signed_in" },
    { event: "customer/signed_out" },
  ],
  async ({ event, step }) => {
    const eventName = toEventName(event.name);

    // Extract fields common across all events
    const data = event.data as Record<string, unknown>;
    const userId = (data.userId as string | undefined) ?? undefined;
    const value = typeof data.value === "number" ? data.value : undefined;
    const currency = typeof data.currency === "string" ? data.currency : undefined;

    // ── Meta Conversions API ────────────────────────────────────────────────
    const metaPixelId = process.env.META_PIXEL_ID;
    const metaToken = process.env.META_CAPI_ACCESS_TOKEN;
    const metaTestCode = process.env.META_TEST_EVENT_CODE;

    if (metaPixelId && metaToken) {
      await step.run("send-meta-capi", async () => {
        const payload: Record<string, unknown> = {
          data: [
            {
              event_name: eventName,
              event_time: Math.floor(Date.now() / 1000),
              action_source: "app",
              user_data: {
                ...(userId ? { external_id: hashUserId(userId) } : {}),
              },
              custom_data: {
                ...(value !== undefined ? { value } : {}),
                ...(currency !== undefined ? { currency } : {}),
              },
            },
          ],
          ...(metaTestCode ? { test_event_code: metaTestCode } : {}),
        };

        const url = `https://graph.facebook.com/v19.0/${metaPixelId}/events?access_token=${metaToken}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Meta CAPI ${res.status}: ${text}`);
        }

        return { ok: true as const };
      });
    }

    // ── GA4 Measurement Protocol ────────────────────────────────────────────
    const ga4MeasurementId = process.env.GA4_MEASUREMENT_ID;
    const ga4ApiSecret = process.env.GA4_API_SECRET;

    if (ga4MeasurementId && ga4ApiSecret) {
      await step.run("send-ga4", async () => {
        // GA4 event names must be snake_case
        const ga4EventName = eventName
          .replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`)
          .replace(/^_/, "");

        const payload = {
          client_id: userId ?? randomUUID(),
          events: [
            {
              name: ga4EventName,
              params: {
                ...(value !== undefined ? { value } : {}),
                ...(currency !== undefined ? { currency } : {}),
              },
            },
          ],
        };

        const url = `https://www.google-analytics.com/mp/collect?measurement_id=${ga4MeasurementId}&api_secret=${ga4ApiSecret}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        // GA4 MP returns 204 on success; non-2xx is a failure worth retrying
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`GA4 MP ${res.status}: ${text}`);
        }

        return { ok: true as const };
      });
    }

    return { ok: true as const };
  },
);
