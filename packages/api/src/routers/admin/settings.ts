import { z } from "zod";

import {
  settingsUpdateSchema,
  whatsappSettingsUpdateSchema,
} from "@workspace/validators/catalog";

import { adminProcedure, createTRPCRouter } from "../../init";
import {
  getDeliveryFeeEgp,
  getStoreLinks,
  getSupportWhatsapp,
  getWhatsAppCredentialsMasked,
  getWhatsAppProvider,
  SETTING_KEYS,
  upsertSetting,
  upsertWhatsappConfig,
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

  getStoreLinks: adminProcedure.query(async ({ ctx }) =>
    getStoreLinks(ctx.db),
  ),

  updateStoreLinks: adminProcedure
    .input(
      z.object({
        playStoreUrl: z
          .string()
          .trim()
          .max(512)
          .refine((v) => v === "" || z.url().safeParse(v).success, {
            message: "validation.urlInvalid",
          })
          .transform((v) => (v === "" ? null : v)),
        appStoreUrl: z
          .string()
          .trim()
          .max(512)
          .refine((v) => v === "" || z.url().safeParse(v).success, {
            message: "validation.urlInvalid",
          })
          .transform((v) => (v === "" ? null : v)),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await Promise.all([
        upsertSetting(
          ctx.db,
          SETTING_KEYS.playStoreUrl,
          { url: input.playStoreUrl ?? "" },
          ctx.session.user.id,
        ),
        upsertSetting(
          ctx.db,
          SETTING_KEYS.appStoreUrl,
          { url: input.appStoreUrl ?? "" },
          ctx.session.user.id,
        ),
      ]);
      return { ok: true as const };
    }),

  getWhatsapp: adminProcedure.query(async ({ ctx }) => ({
    provider: await getWhatsAppProvider(ctx.db),
    credentials: await getWhatsAppCredentialsMasked(ctx.db),
  })),

  updateWhatsapp: adminProcedure
    .input(whatsappSettingsUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      await upsertWhatsappConfig(ctx.db, input, ctx.session.user.id);
      return { ok: true as const };
    }),
});
