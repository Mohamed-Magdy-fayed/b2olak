"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTranslation } from "@workspace/i18n/react";
import { cn } from "@workspace/ui/lib/utils";

const links = [
  { href: "/admin", key: "admin.nav.dashboard" },
  { href: "/admin/categories", key: "admin.nav.categories" },
  { href: "/admin/items", key: "admin.nav.items" },
  { href: "/admin/settings", key: "admin.nav.settings" },
] as const;

export function AdminNav() {
  const { t } = useTranslation();
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t(link.key)}
          </Link>
        );
      })}
    </nav>
  );
}
