"use client";

import { useEffect, useRef, useState } from "react";
import { TRPCClientError } from "@trpc/client";
import { toast } from "sonner";

import { useTranslation } from "@workspace/i18n/react";
import { useTRPC } from "@/lib/trpc/client";
import { useAppForm } from "@/components/forms/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { egyptianPhoneSchema, otpCodeSchema } from "@workspace/validators/auth";

const RESEND_SECONDS = 60;

function trpcErrorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof TRPCClientError) {
    const msg = error.message;
    if (msg.includes(".")) return t(msg);
    if (error.data?.code === "TOO_MANY_REQUESTS")
      return t("errors.tooManyRequests");
  }
  return t("errors.unknown");
}

export function PhoneVerifyCard() {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [resendCountdown, setResendCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCountdown() {
    setResendCountdown(RESEND_SECONDS);
    countdownRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const request = useMutation(
    trpc.auth.requestPhoneLink.mutationOptions({
      onSuccess: () => {
        setStep("code");
        startCountdown();
      },
      onError: (err) => {
        toast.error(trpcErrorMessage(err, (k) => String(t(k as never))));
      },
    }),
  );

  const confirm = useMutation(
    trpc.auth.confirmPhoneLink.mutationOptions({
      onSuccess: () => {
        toast.success(t("account.phoneLinked"));
        void queryClient.invalidateQueries({
          queryKey: trpc.auth.me.queryKey(),
        });
      },
      onError: (err) => {
        toast.error(trpcErrorMessage(err, (k) => String(t(k as never))));
      },
    }),
  );

  const form = useAppForm({
    defaultValues: { phone: "", code: "" },
    onSubmit: ({ value }) => {
      confirm.mutate({ phone: value.phone, code: value.code });
    },
  });

  async function sendCode() {
    await form.validateField("phone", "submit");
    if (!form.getFieldMeta("phone")?.isValid) return;
    request.mutate({ phone: form.getFieldValue("phone") });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("account.linkPhoneTitle")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("account.linkPhoneBody")}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {step === "phone" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendCode();
            }}
            className="flex flex-col gap-4"
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
                  label={t("mobile.phoneLabel")}
                  placeholder={t("mobile.phonePlaceholder")}
                />
              )}
            </form.AppField>
            <Button type="submit" disabled={request.isPending}>
              {request.isPending ? t("mobile.sending") : t("account.linkPhoneCta")}
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
            className="flex flex-col gap-4"
          >
            <p className="text-sm text-muted-foreground">
              {t("mobile.codeSentTo", { phone: form.getFieldValue("phone") })}
            </p>
            <form.AppField
              name="code"
              validators={{
                onSubmit: ({ value }) =>
                  otpCodeSchema.safeParse(value).success
                    ? undefined
                    : "validation.otpInvalid",
              }}
            >
              {(field) => (
                <field.StringField
                  label={t("mobile.codeLabel")}
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  dir="ltr"
                />
              )}
            </form.AppField>
            <Button type="submit" disabled={confirm.isPending}>
              {confirm.isPending ? t("mobile.verifying") : t("mobile.verify")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void sendCode()}
              disabled={resendCountdown > 0 || request.isPending}
            >
              {resendCountdown > 0
                ? t("mobile.resendIn", { seconds: String(resendCountdown) })
                : t("mobile.resend")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
