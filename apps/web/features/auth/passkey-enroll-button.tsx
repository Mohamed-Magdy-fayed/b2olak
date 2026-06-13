"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  browserSupportsWebAuthn,
  startRegistration,
} from "@simplewebauthn/browser";

import { useTranslation } from "@workspace/i18n/react";
import { Button } from "@workspace/ui/components/button";

import {
  finishPasskeyEnrollment,
  startPasskeyEnrollment,
} from "./passkey-actions";

interface PasskeyEnrollButtonProps {
  label?: string;
  onEnrolled?: () => void;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}

export function PasskeyEnrollButton({
  label,
  onEnrolled,
  variant,
  size,
  className,
}: PasskeyEnrollButtonProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  if (!browserSupportsWebAuthn()) return null;

  async function handleEnroll() {
    setLoading(true);
    try {
      const startRes = await startPasskeyEnrollment();
      if (!startRes.ok) {
        toast.error(t(startRes.error as never));
        return;
      }

      let regResponse;
      try {
        regResponse = await startRegistration({ optionsJSON: startRes.data });
      } catch {
        // User cancelled or dismissed — silently reset
        return;
      }

      const finishRes = await finishPasskeyEnrollment(regResponse, label);
      if (!finishRes.ok) {
        toast.error(t(finishRes.error as never));
        return;
      }

      toast.success(t("auth.passkey.enrollSuccess" as never));
      onEnrolled?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={loading}
      onClick={handleEnroll}
    >
      {loading ? t("auth.passkey.enrolling" as never) : t("auth.passkey.addPasskey" as never)}
    </Button>
  );
}
