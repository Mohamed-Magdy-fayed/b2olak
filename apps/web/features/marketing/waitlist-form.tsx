"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { egyptianPhoneSchema } from "@workspace/validators/auth";

import { useTRPC } from "@/lib/trpc/client";

export function WaitlistForm() {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const join = useMutation(
    trpc.waitlist.join.mutationOptions({
      onSuccess: () => setDone(true),
    }),
  );

  if (done) {
    return (
      <p className="text-primary-foreground font-medium">
        {t("landing.download.waitlistDone")}
      </p>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhoneError(null);
    const result = egyptianPhoneSchema.safeParse(phone);
    if (!result.success) {
      setPhoneError(t("validation.phoneInvalid"));
      return;
    }
    join.mutate({ phone: result.data });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-2"
    >
      <Input
        type="tel"
        dir="ltr"
        value={phone}
        onChange={(e) => {
          setPhoneError(null);
          setPhone(e.target.value);
        }}
        aria-label={t("landing.download.waitlistLabel")}
        placeholder={t("mobile.phonePlaceholder")}
        className="bg-background text-foreground"
        aria-invalid={phoneError ? true : undefined}
      />
      {phoneError ? (
        <p className="text-primary-foreground/80 text-sm">{phoneError}</p>
      ) : null}
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
