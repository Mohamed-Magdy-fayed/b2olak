"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { Button } from "@workspace/ui/components/button";
import { egyptianPhoneSchema } from "@workspace/validators/auth";

import { useTRPC } from "@/lib/trpc/client";
import { useAppForm } from "@/components/forms/hooks";

export function WaitlistForm() {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const [done, setDone] = useState(false);

  const join = useMutation(
    trpc.waitlist.join.mutationOptions({
      onSuccess: () => setDone(true),
    }),
  );

  const form = useAppForm({
    defaultValues: { phone: "" },
    onSubmit: ({ value }) => {
      const result = egyptianPhoneSchema.safeParse(value.phone);
      if (result.success) join.mutate({ phone: result.data });
    },
  });

  if (done) {
    return (
      <p className="text-primary-foreground font-medium">
        {t("landing.download.waitlistDone")}
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="flex w-full max-w-sm flex-col gap-2"
    >
      <form.AppField
        name="phone"
        validators={{
          onSubmit: ({ value }) =>
            egyptianPhoneSchema.safeParse(value).success
              ? undefined
              : "validation.phoneInvalid",
        }}
      >
        {(field) => (
          <field.PhoneField
            label={t("landing.download.waitlistLabel")}
            srOnlyLabel
            placeholder={t("mobile.phonePlaceholder")}
            className="bg-background text-foreground placeholder:text-foreground/50"
          />
        )}
      </form.AppField>
      <Button
        type="submit"
        size="xl"
        disabled={join.isPending}
        className="bg-background text-foreground hover:bg-background/90 active:scale-95"
      >
        {t("landing.download.waitlistCta")}
      </Button>
    </form>
  );
}
