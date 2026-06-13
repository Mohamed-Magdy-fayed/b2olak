"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

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
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import {
  requestOtpAction,
  signInWithGoogleAction,
  verifyOtpAction,
} from "./actions";

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
  const [reqState, requestAction, requestPending] = useActionState(
    requestOtpAction,
    undefined,
  );
  const [verState, verifyAction, verifyPending] = useActionState(
    verifyOtpAction,
    undefined,
  );

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (reqState?.phase === "code") {
      setStep("code");
      setResendIn(RESEND_SECONDS);
    }
  }, [reqState]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const phone = reqState?.phase === "code" ? reqState.phone : "";
  const error =
    step === "code"
      ? (verState?.error ?? reqState?.error)
      : (reqState?.error ??
        (oauthError
          ? OAUTH_ERROR_KEYS[oauthError as keyof typeof OAUTH_ERROR_KEYS] ??
            "auth.oauthFailed"
          : undefined));

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">
          {t("auth.customerSignInTitle")}
        </CardTitle>
        <CardDescription>
          {step === "phone"
            ? t("auth.customerSignInSubtitle")
            : t("mobile.codeSentTo", { phone })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {step === "phone" ? (
          <form action={requestAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">{t("mobile.phoneLabel")}</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                placeholder={t("mobile.phonePlaceholder")}
                required
              />
            </div>
            <Button type="submit" disabled={requestPending}>
              {requestPending ? t("mobile.sending") : t("mobile.sendCode")}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <form action={verifyAction} className="flex flex-col gap-4">
              <input type="hidden" name="phone" value={phone} />
              {next ? <input type="hidden" name="next" value={next} /> : null}
              <div className="flex flex-col gap-2">
                <Label htmlFor="code">{t("mobile.codeLabel")}</Label>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  dir="ltr"
                  className="text-center text-lg tracking-[0.5em]"
                  required
                />
              </div>
              <Button type="submit" disabled={verifyPending}>
                {verifyPending ? t("mobile.verifying") : t("mobile.verify")}
              </Button>
            </form>
            <div className="flex items-center justify-between gap-2">
              <form action={requestAction}>
                <input type="hidden" name="phone" value={phone} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  disabled={resendIn > 0 || requestPending}
                >
                  {resendIn > 0
                    ? t("mobile.resendIn", { seconds: resendIn })
                    : t("mobile.resend")}
                </Button>
              </form>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep("phone")}
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

        <p className="text-muted-foreground text-center text-sm">
          <Link href="/sign-in/admin" className="hover:text-foreground underline">
            {t("auth.staffSignIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
