"use client";

import { useEffect, useState, useTransition } from "react";

import { useTranslation } from "@workspace/i18n/react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { egyptianPhoneSchema, otpCodeSchema } from "@workspace/validators/auth";

import { useAppForm } from "@/components/forms/hooks";
import {
  requestOtpAction,
  signInWithGoogleAction,
  verifyOtpAction,
} from "./actions";
import { PasskeyLoginButton } from "./passkey-login-button";

const RESEND_SECONDS = 60;

const OAUTH_ERROR_KEYS = {
  failed: "auth.oauthFailed",
  suspended: "auth.suspended",
  staff: "auth.oauthStaffEmail",
} as const;

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
      />
    </svg>
  );
}

export function CustomerSignIn({
  next,
  oauthError,
}: {
  next: string | null;
  oauthError: string | null;
}) {
  const { t } = useTranslation();
  const [requestPending, startRequest] = useTransition();
  const [verifyPending, startVerify] = useTransition();

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [confirmedPhone, setConfirmedPhone] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(
    oauthError
      ? (OAUTH_ERROR_KEYS[oauthError as keyof typeof OAUTH_ERROR_KEYS] ??
          "auth.oauthFailed")
      : null,
  );

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const form = useAppForm({
    defaultValues: { phone: "", code: "" },
    onSubmit: ({ value }) => {
      // Verify step — phone is the one confirmed by the request step.
      setError(null);
      startVerify(async () => {
        const fd = new FormData();
        fd.set("phone", confirmedPhone);
        fd.set("code", value.code);
        if (next) fd.set("next", next);
        const result = await verifyOtpAction(undefined, fd);
        if (result?.error) setError(result.error);
      });
    },
  });

  async function sendCode() {
    await form.validateField("phone", "submit");
    if (!form.getFieldMeta("phone")?.isValid) return;
    const phoneVal = form.getFieldValue("phone");
    setError(null);
    startRequest(async () => {
      const fd = new FormData();
      fd.set("phone", phoneVal);
      const result = await requestOtpAction(undefined, fd);
      if (result?.phase === "code") {
        setConfirmedPhone(result.phone);
        setStep("code");
        setResendIn(RESEND_SECONDS);
        setTimeout(() => document.getElementById("code")?.focus(), 100);
      } else if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">
          {t("auth.customerSignInTitle")}
        </CardTitle>
        <CardDescription>
          {step === "phone"
            ? t("auth.customerSignInSubtitle")
            : t("mobile.codeSentTo", { phone: confirmedPhone })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PasskeyLoginButton next={next} className="w-full gap-2" />

        <div className="flex items-center gap-3">
          <div className="bg-border h-px flex-1" />
          <span className="text-muted-foreground text-xs uppercase">
            {t("auth.orDivider")}
          </span>
          <div className="bg-border h-px flex-1" />
        </div>

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
                  autoFocus
                />
              )}
            </form.AppField>
            <Button type="submit" disabled={requestPending}>
              {requestPending ? t("mobile.sending") : t("mobile.sendCode")}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void form.handleSubmit();
              }}
              className="flex flex-col gap-4"
            >
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
                    className="text-center text-lg tracking-[0.5em]"
                  />
                )}
              </form.AppField>
              <Button type="submit" disabled={verifyPending}>
                {verifyPending ? t("mobile.verifying") : t("mobile.verify")}
              </Button>
            </form>
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={resendIn > 0 || requestPending}
                onClick={() => void sendCode()}
              >
                {resendIn > 0
                  ? t("mobile.resendIn", { seconds: resendIn })
                  : t("mobile.resend")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("phone");
                  setError(null);
                }}
              >
                {t("auth.changeNumber")}
              </Button>
            </div>
          </div>
        )}

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{t(error as never)}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex items-center gap-3">
          <div className="bg-border h-px flex-1" />
          <span className="text-muted-foreground text-xs uppercase">
            {t("auth.orDivider")}
          </span>
          <div className="bg-border h-px flex-1" />
        </div>

        <form action={signInWithGoogleAction}>
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <Button type="submit" variant="outline" className="w-full gap-2">
            <GoogleIcon />
            {t("auth.continueWithGoogle")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
