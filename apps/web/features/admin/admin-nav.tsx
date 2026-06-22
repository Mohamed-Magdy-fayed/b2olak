"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Package,
  Ruler,
  ScanSearch,
  Settings,
  Tag,
  Truck,
  Users,
} from "lucide-react";

import { useTranslation } from "@workspace/i18n/react";
import { cn } from "@workspace/ui/lib/utils";

const links = [
  { href: "/admin", key: "admin.nav.dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", key: "admin.nav.orders", icon: ClipboardList },
  { href: "/admin/drivers", key: "admin.nav.drivers", icon: Truck },
  { href: "/admin/users", key: "admin.nav.users", icon: Users },
  { href: "/admin/categories", key: "admin.nav.categories", icon: Tag },
  { href: "/admin/items", key: "admin.nav.items", icon: Package },
  { href: "/admin/units", key: "admin.nav.units", icon: Ruler },
  { href: "/admin/items/review", key: "admin.nav.review", icon: ScanSearch },
  { href: "/admin/geo", key: "admin.nav.geo", icon: MapPin },
  { href: "/admin/settings", key: "admin.nav.settings", icon: Settings },
] as const;

type NavHref = (typeof links)[number]["href"];

/**
 * Nav is grouped into labelled sections so related destinations sit together
 * with breathing room, instead of one clamped flat list. `labelKey: null`
 * renders an un-headed group (the dashboard overview).
 */
const groups: {
  labelKey:
  | "admin.nav.group.operations"
  | "admin.nav.group.catalog"
  | "admin.nav.group.settings"
  | null;
  hrefs: readonly NavHref[];
}[] = [
    { labelKey: null, hrefs: ["/admin"] },
    {
      labelKey: "admin.nav.group.operations",
      hrefs: ["/admin/orders", "/admin/drivers", "/admin/users"],
    },
    {
      labelKey: "admin.nav.group.catalog",
      hrefs: ["/admin/categories", "/admin/items", "/admin/units", "/admin/items/review"],
    },
    {
      labelKey: "admin.nav.group.settings",
      hrefs: ["/admin/geo", "/admin/settings"],
    },
  ];

export function AdminNav({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useTranslation();
  const pathname = usePathname();

  // Longest matching prefix wins, so /admin/items/review doesn't also light /admin/items.
  const activeHref = links
    .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.labelKey ?? "overview"} className="flex flex-col gap-0.5">
          {group.labelKey && !collapsed ? (
            <span className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t(group.labelKey)}
            </span>
          ) : group.labelKey && collapsed ? (
            <span className="mx-auto mb-1 h-px w-6 bg-border" aria-hidden />
          ) : null}
          {group.hrefs.map((href) => {
            const link = links.find((l) => l.href === href)!;
            const active = activeHref === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                title={collapsed ? t(link.key) : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-2" : "",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "shrink-0",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                  style={{ width: 18, height: 18 }}
                  aria-hidden
                />
                {!collapsed && <span>{t(link.key)}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
