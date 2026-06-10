"use client";

import { useQuery } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { useTRPC } from "@/lib/trpc/client";

export function HealthBadge() {
  const trpc = useTRPC();
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuery(
    trpc.health.ping.queryOptions(),
  );

  const label = isLoading
    ? t("home.apiChecking")
    : isError || !data?.ok
      ? t("home.apiError")
      : t("home.apiOk");

  const tone = isLoading
    ? "bg-muted text-muted-foreground border-border"
    : isError || !data?.ok
      ? "bg-destructive/10 text-destructive border-destructive"
      : "bg-primary/10 text-primary border-primary";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${tone}`}
    >
      <span className="size-2 rounded-full bg-current" />
      {t("home.apiStatus")}: {label}
    </span>
  );
}
