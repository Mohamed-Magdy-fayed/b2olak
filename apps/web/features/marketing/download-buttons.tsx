"use client";

import { useTranslation } from "@workspace/i18n/react";

import { trackEvent } from "@/lib/analytics";

/** Store links land in P11 once EAS builds are submitted. */
const ANDROID_URL = "#download";
const IOS_URL = "#download";

export function DownloadButtons({
  variant = "default",
}: {
  variant?: "default" | "inverted";
}) {
  const { t } = useTranslation();

  const base =
    "rounded-xl px-6 py-3 text-base font-bold transition-transform active:scale-95";
  const primary =
    variant === "inverted"
      ? "bg-background text-foreground"
      : "bg-primary text-primary-foreground";
  const secondary =
    variant === "inverted"
      ? "border border-primary-foreground/40 text-primary-foreground"
      : "border border-border text-foreground";

  return (
    <div className="flex flex-wrap justify-center gap-3">
      <a
        href={ANDROID_URL}
        className={`${base} ${primary}`}
        onClick={() => trackEvent("download_click", { platform: "android" })}
      >
        🤖 {t("landing.hero.ctaAndroid")}
      </a>
      <a
        href={IOS_URL}
        className={`${base} ${secondary}`}
        onClick={() => trackEvent("download_click", { platform: "ios" })}
      >
         {t("landing.hero.ctaIos")}
      </a>
    </div>
  );
}
