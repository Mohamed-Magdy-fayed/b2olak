import { settingsUpdateSchema } from "@workspace/validators/catalog";

import { adminProcedure, createTRPCRouter } from "../../init";
import {
  getDeliveryFeeEgp,
  getSupportWhatsapp,
  SETTING_KEYS,
  upsertSetting,
} from "../../lib/settings";

export const adminSettingsRouter = createTRPCRouter({
  get: adminProcedure.query(async ({ ctx }) => ({
    deliveryFeeEgp: await getDeliveryFeeEgp(ctx.db),
    supportWhatsappNumber: await getSupportWhatsapp(ctx.db),
  })),

  update: adminProcedure
    .input(settingsUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      await upsertSetting(
        ctx.db,
        SETTING_KEYS.deliveryFee,
        { amount: input.deliveryFeeEgp },
        ctx.session.user.id,
      );
      await upsertSetting(
        ctx.db,
        SETTING_KEYS.supportWhatsapp,
        { value: input.supportWhatsappNumber },
        ctx.session.user.id,
      );
      return { ok: true as const };
    }),
});
