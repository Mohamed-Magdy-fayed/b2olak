"use client";

import {
  CheckCircle2,
  Circle,
  Package,
  ShoppingCart,
  Truck,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useTranslation } from "@workspace/i18n/react";
import { cn } from "@workspace/ui/lib/utils";

const STEPS = [
  { key: "placed", Icon: Circle },
  { key: "assigned", Icon: UserCheck },
  { key: "shopping", Icon: ShoppingCart },
  { key: "purchased", Icon: Package },
  { key: "delivering", Icon: Truck },
  { key: "delivered", Icon: CheckCircle2 },
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
      <div className="flex items-center gap-3 rounded-xl bg-destructive/10 p-4">
        <XCircle className="size-5 shrink-0 text-destructive" aria-hidden />
        <span className="text-sm font-semibold text-destructive">
          {t("shop.status.cancelled")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {STEPS.map((step, index) => {
        const reached = reachedStatuses.has(step.key) || status === step.key;
        const isLast = index === STEPS.length - 1;
        const isCurrent = status === step.key;
        const event = statusEvents.find((e) => e.toStatus === step.key);
        const Icon = reached ? CheckCircle2 : step.Icon;

        return (
          <div key={step.key} className="flex items-start gap-3">
            {/* Icon + connector line */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 transition-colors",
                  reached
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-accent text-muted-foreground",
                  isCurrent && "ring-2 ring-primary/30",
                )}
              >
                <Icon
                  className={cn(
                    "size-4",
                    reached ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-hidden
                />
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "my-0.5 w-0.5 flex-1",
                    reached ? "bg-primary/40" : "bg-border",
                  )}
                  style={{ minHeight: 20 }}
                />
              )}
            </div>

            {/* Label + timestamp */}
            <div className={cn("flex flex-1 flex-col pb-4", isLast && "pb-0")}>
              <span
                className={cn(
                  "text-sm font-medium leading-8",
                  reached ? "text-foreground" : "text-muted-foreground",
                  isCurrent && "font-semibold text-primary",
                )}
              >
                {t(`shop.status.${step.key}` as never)}
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
          </div>
        );
      })}
    </div>
  );
}
