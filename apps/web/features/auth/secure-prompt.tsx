"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { browserSupportsWebAuthn } from "@simplewebauthn/browser";

import { useTranslation } from "@workspace/i18n/react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

import { dismissPasskeyPrompt } from "./passkey-actions";
import { PasskeyEnrollButton } from "./passkey-enroll-button";

interface SecurePromptProps {
  next: string;
}

export function SecurePrompt({ next }: SecurePromptProps) {
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (!browserSupportsWebAuthn()) {
      router.replace(next);
    }
  }, [next, router]);

  async function handleDone() {
    await dismissPasskeyPrompt();
    router.push(next);
  }

  async function handleSkip() {
    await dismissPasskeyPrompt();
    router.push(next);
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">
            {t("auth.passkey.secureTitle" as never)}
          </CardTitle>
          <CardDescription>
            {t("auth.passkey.secureBody" as never)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <PasskeyEnrollButton
            onEnrolled={handleDone}
            className="w-full"
          />
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={handleSkip}
          >
            {t("auth.passkey.skipForNow" as never)}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
