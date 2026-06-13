"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import {
  browserSupportsWebAuthn,
  startAuthentication,
} from "@simplewebauthn/browser";

import { useTranslation } from "@workspace/i18n/react";
import { Button } from "@workspace/ui/components/button";

import { finishPasskeyLogin, startPasskeyLogin } from "./passkey-actions";

interface PasskeyLoginButtonProps {
  next?: string | null;
  className?: string;
}

export function PasskeyLoginButton({ next, className }: PasskeyLoginButtonProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!browserSupportsWebAuthn()) return null;

  async function handleLogin() {
    setLoading(true);
    try {
      const startRes = await startPasskeyLogin();
      if (!startRes.ok) {
        toast.error(t(startRes.error as never));
        return;
      }

      let authResponse;
      try {
        authResponse = await startAuthentication({ optionsJSON: startRes.data });
      } catch {
        // User cancelled — silently reset
        return;
      }

      const finishRes = await finishPasskeyLogin(authResponse, next);
      if (!finishRes.ok) {
        toast.error(t(finishRes.error as never));
        return;
      }

      router.push(finishRes.data.redirectTo);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      disabled={loading}
      onClick={handleLogin}
    >
      <KeyRound className="size-4" />
      {loading
        ? t("auth.passkey.signingIn" as never)
        : t("auth.passkey.signInWithPasskey" as never)}
    </Button>
  );
}
