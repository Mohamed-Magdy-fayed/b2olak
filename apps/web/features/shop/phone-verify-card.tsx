"use client";

import { useEffect, useRef, useState } from "react";
import { TRPCClientError } from "@trpc/client";
import { toast } from "sonner";

import { useTranslation } from "@workspace/i18n/react";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

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

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("account.linkPhoneTitle")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("account.linkPhoneBody")}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {step === "phone" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="verify-phone">{t("mobile.phoneLabel")}</Label>
              <Input
                id="verify-phone"
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("mobile.phonePlaceholder")}
              />
            </div>
            <Button
              onClick={() => request.mutate({ phone })}
              disabled={request.isPending || !phone.trim()}
            >
              {request.isPending ? t("mobile.sending") : t("account.linkPhoneCta")}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t("mobile.codeSentTo", { phone })}
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="verify-code">{t("mobile.codeLabel")}</Label>
              <Input
                id="verify-code"
                type="text"
                dir="ltr"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <Button
              onClick={() => confirm.mutate({ phone, code })}
              disabled={confirm.isPending || code.length !== 6}
            >
              {confirm.isPending ? t("mobile.verifying") : t("mobile.verify")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                request.mutate({ phone });
              }}
              disabled={resendCountdown > 0 || request.isPending}
            >
              {resendCountdown > 0
                ? t("mobile.resendIn", { seconds: String(resendCountdown) })
                : t("mobile.resend")}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
