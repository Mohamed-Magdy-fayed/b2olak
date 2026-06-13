"use client";

import { useTranslation } from "@workspace/i18n/react";

const TIMELINE_STEPS = [
  "placed",
  "assigned",
  "shopping",
  "purchased",
  "delivering",
  "delivered",
] as const;

type StatusEvent = {
  toStatus: string;
  createdAt: Date | string;
};

type OrderTimelineProps = {
  statusEvents: StatusEvent[];
  status: string;
};

export function OrderTimeline({ statusEvents, status }: OrderTimelineProps) {
  const { t } = useTranslation();

  const reachedStatuses = new Set(statusEvents.map((e) => e.toStatus));
  const cancelled = status === "cancelled";

  if (cancelled) {
    return (
      <p className="text-base font-bold text-destructive">
        {t("shop.status.cancelled")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {TIMELINE_STEPS.map((step) => {
        const reached = reachedStatuses.has(step);
        const event = statusEvents.find((e) => e.toStatus === step);
        return (
          <div key={step} className="flex items-center gap-3">
            <div
              className={`size-3 shrink-0 rounded-full ${reached ? "bg-primary" : "bg-muted"}`}
            />
            <span
              className={`flex-1 text-sm ${reached ? "font-semibold text-foreground" : "text-muted-foreground"}`}
            >
              {t(`shop.status.${step}` as never)}
            </span>
            {event && (
              <span className="text-xs text-muted-foreground">
                {new Date(event.createdAt).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
