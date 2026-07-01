"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { useTranslation } from "@workspace/i18n/react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

import { EntityPageHeader } from "@/features/core/data-table";
import { useTRPC } from "@/lib/trpc/client";

export function PriceSyncPanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();

  const statusOptions = trpc.admin.pricing.syncStatus.queryOptions();
  const { data: run } = useQuery({
    ...statusOptions,
    // Poll while a sync is in flight; idle otherwise.
    refetchInterval: (query) =>
      query.state.data?.status === "running" ? 1500 : false,
  });

  const startSync = useMutation(
    trpc.admin.pricing.startSync.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: statusOptions.queryKey,
        });
      },
      onError: () => toast.error(String(t("admin.pricing.failed"))),
    }),
  );

  const isRunning = run?.status === "running" || startSync.isPending;
  const total = run?.totalItems ?? 0;
  const processed = run?.processedItems ?? 0;
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

  const lastSyncedLabel =
    run?.status === "completed" && run.finishedAt
      ? String(
          t("admin.pricing.lastSynced", {
            when: new Date(run.finishedAt).toLocaleString(
              locale === "ar" ? "ar-EG" : "en-US",
            ),
          }),
        )
      : String(t("admin.pricing.never"));

  return (
    <div className="space-y-4">
      <EntityPageHeader title={String(t("admin.pricing.title"))} />

      <Card>
        <CardHeader>
          <CardTitle>{String(t("admin.pricing.title"))}</CardTitle>
          <CardDescription>
            {String(t("admin.pricing.description"))}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={() => startSync.mutate()}
              disabled={isRunning}
            >
              <RefreshCwIcon
                className={`me-2 size-4 ${isRunning ? "animate-spin" : ""}`}
              />
              {String(
                t(isRunning ? "admin.pricing.running" : "admin.pricing.syncAll"),
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              {run?.status === "failed"
                ? String(t("admin.pricing.failed"))
                : lastSyncedLabel}
            </span>
          </div>

          {isRunning ? (
            <div className="space-y-1.5">
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {String(
                  t("admin.pricing.progress", { processed, total }),
                )}
              </p>
            </div>
          ) : run?.status === "completed" ? (
            <p className="text-sm text-muted-foreground">
              {String(
                t("admin.pricing.completed", { count: run.statsUpserted }),
              )}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
