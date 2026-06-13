"use client";

import { Badge } from "@workspace/ui/components/badge";
import { useTranslation } from "@workspace/i18n/react";

import type { OrderStatus } from "@workspace/validators/order-status";
import { ACTIVE_ORDER_STATUSES } from "@workspace/validators/order-status";

type OrderStatusBadgeProps = {
  status: OrderStatus;
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const { t } = useTranslation();
  const label = t(`shop.status.${status}` as never);

  if (status === "delivered") {
    return <Badge variant="success">{label}</Badge>;
  }
  if (status === "cancelled") {
    return <Badge variant="destructive">{label}</Badge>;
  }
  if (ACTIVE_ORDER_STATUSES.includes(status)) {
    return <Badge variant="default">{label}</Badge>;
  }
  return <Badge variant="outline">{label}</Badge>;
}
