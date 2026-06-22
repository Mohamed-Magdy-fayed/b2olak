"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "@workspace/i18n/react";

const ROUTE_LABELS: Record<string, string> = {
  "/admin": "admin.nav.dashboard",
  "/admin/orders": "admin.nav.orders",
  "/admin/drivers": "admin.nav.drivers",
  "/admin/users": "admin.nav.users",
  "/admin/categories": "admin.nav.categories",
  "/admin/items": "admin.nav.items",
  "/admin/units": "admin.nav.units",
  "/admin/items/review": "admin.nav.review",
  "/admin/geo": "admin.nav.geo",
  "/admin/settings": "admin.nav.settings",
};

export function AdminBreadcrumb() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const key = ROUTE_LABELS[pathname] ?? "admin.nav.dashboard";

  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm">
      <span className="font-display font-black text-primary">ba2olak</span>
      <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
      <span className="font-medium text-foreground">{t(key as never)}</span>
    </nav>
  );
}
