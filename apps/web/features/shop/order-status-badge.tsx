"use client";

import {
  CheckCircle2,
  CheckSquare,
  Clock,
  Package,
  ShoppingCart,
  Truck,
  UserCheck,
  XCircle,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { useTranslation } from "@workspace/i18n/react";
import type { OrderStatus } from "@workspace/validators/order-status";
import { ACTIVE_ORDER_STATUSES } from "@workspace/validators/order-status";

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  placed: Clock,
  assigned: UserCheck,
  shopping: ShoppingCart,
  purchased: CheckSquare,
  delivering: Truck,
  delivered: CheckCircle2,
  cancelled: XCircle,
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  const label = t(`shop.status.${status}` as never);
  const Icon = STATUS_ICONS[status] ?? Package;

  if (status === "delivered") {
    return (
      <Badge variant="success" className="gap-1">
        <Icon className="size-3" aria-hidden />
        {label}
      </Badge>
    );
  }
  if (status === "cancelled") {
    return (
      <Badge variant="destructive" className="gap-1">
        <Icon className="size-3" aria-hidden />
        {label}
      </Badge>
    );
  }
  if (ACTIVE_ORDER_STATUSES.includes(status)) {
    return (
      <Badge variant="default" className="gap-1">
        <Icon className="size-3" aria-hidden />
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="size-3" aria-hidden />
      {label}
    </Badge>
  );
}
