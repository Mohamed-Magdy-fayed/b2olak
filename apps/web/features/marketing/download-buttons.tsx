"use client";

import { useTranslation } from "@workspace/i18n/react";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { trackEvent } from "@/lib/analytics";

import { AppleIcon, GooglePlayIcon } from "./store-icons";

export function DownloadButtons({
  playStoreUrl,
  appStoreUrl,
  variant = "default",
}: {
  playStoreUrl: string | null;
  appStoreUrl: string | null;
  variant?: "default" | "inverted";
}) {
  const { t } = useTranslation();

  const btnClass = cn(
    buttonVariants({ size: "xl" }),
    "active:scale-95",
    variant === "inverted" &&
      "bg-background text-foreground hover:bg-background/90",
  );

  return (
    <div className="flex flex-wrap justify-center gap-3">
      <a
        href={playStoreUrl ?? "#download"}
        className={btnClass}
        target={playStoreUrl ? "_blank" : undefined}
        rel={playStoreUrl ? "noopener noreferrer" : undefined}
        aria-label={t("landing.download.androidAria")}
        onClick={() => trackEvent("download_click", { platform: "android" })}
      >
        <GooglePlayIcon className="size-5" />
        {t("landing.hero.ctaAndroid")}
      </a>
      <a
        href={appStoreUrl ?? "#download"}
        className={btnClass}
        target={appStoreUrl ? "_blank" : undefined}
        rel={appStoreUrl ? "noopener noreferrer" : undefined}
        aria-label={t("landing.download.iosAria")}
        onClick={() => trackEvent("download_click", { platform: "ios" })}
      >
        <AppleIcon className="size-5" />
        {t("landing.hero.ctaIos")}
      </a>
    </div>
  );
}
