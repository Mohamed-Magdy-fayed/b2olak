import { eq } from "drizzle-orm";

import { db } from "@workspace/db/client";
import { UsersTable } from "@workspace/db/schemas/auth/users";

import { isExpoPushToken, sendExpoPush } from "../../expo/push";
import { getWhatsAppConfig } from "../../whatsapp/config";
import { sendWhatsAppMessage } from "../../whatsapp/send";
import { customerMessages } from "../../whatsapp/templates";
import { inngest } from "../client";

type Locale = "en" | "ar";

function pushWalletCredited(
  amount: string,
  locale: Locale,
): { title: string; body: string } {
  return locale === "ar"
    ? { title: "تم إضافة رصيد", body: `أضفنا ${amount} جنيه إلى محفظتك` }
    : { title: "Wallet Credited", body: `We added ${amount} EGP to your wallet` };
}

/**
 * Tells a customer their wallet was credited after an overpayment at delivery.
 * Respects the customer's channel preference (push vs WhatsApp), same as
 * order-status notifications — see order-status-changed.ts.
 */
export const onWalletCredited = inngest.createFunction(
  { id: "wallet-credited", retries: 2 },
  { event: "wallet/credited" },
  async ({ event, step }) => {
    const { userId, amount } = event.data;

    const user = await step.run("load-user", () =>
      db.query.UsersTable.findFirst({
        where: eq(UsersTable.id, userId),
        columns: {
          phone: true,
          preferredLocale: true,
          pushToken: true,
          notificationChannel: true,
          walletBalance: true,
        },
      }),
    );
    if (!user) return { skipped: true as const };

    const locale = user.preferredLocale;
    const amountStr = amount.toFixed(2);
    const balanceStr = Number(user.walletBalance ?? 0).toFixed(2);

    const canPush =
      user.notificationChannel === "push" && isExpoPushToken(user.pushToken);

    if (canPush) {
      await step.run("notify-push", () =>
        sendExpoPush(user.pushToken, {
          ...pushWalletCredited(amountStr, locale),
          data: { orderId: event.data.orderId },
        }),
      );
    } else if (user.phone) {
      const config = await step.run("load-wa-config", () =>
        getWhatsAppConfig(db),
      );
      await step.run("notify-whatsapp", () =>
        sendWhatsAppMessage(
          config,
          user.phone!,
          customerMessages.walletCredited(
            { amount: amountStr, balance: balanceStr },
            locale,
          ),
          `wallet-credited:${event.data.orderId}`,
        ),
      );
    }

    return { ok: true as const };
  },
);
