"use client";

import { useTranslation } from "@workspace/i18n/react";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { trackEvent } from "@/lib/analytics";

/** Store links land once EAS builds are submitted. */
const ANDROID_URL = "#download";
const IOS_URL = "#download";

export function DownloadButtons({
  variant = "default",
}: {
  variant?: "default" | "inverted";
}) {
  const { t } = useTranslation();

  const primaryClass = cn(
    buttonVariants({ size: "xl" }),
    "active:scale-95",
    variant === "inverted" &&
      "bg-background text-foreground hover:bg-background/90",
  );
  const secondaryClass = cn(
    buttonVariants({ variant: "outline", size: "xl" }),
    "active:scale-95",
    variant === "inverted" &&
      "border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground dark:bg-transparent",
  );

  return (
    <div className="flex flex-wrap justify-center gap-3">
      <a
        href={ANDROID_URL}
        className={primaryClass}
        onClick={() => trackEvent("download_click", { platform: "android" })}
      >
        🤖 {t("landing.hero.ctaAndroid")}
      </a>
      <a
        href={IOS_URL}
        className={secondaryClass}
        onClick={() => trackEvent("download_click", { platform: "ios" })}
      >
         {t("landing.hero.ctaIos")}
      </a>
    </div>
  );
}
