"use client";

import {
  ClipboardListIcon,
  LayoutDashboardIcon,
  PackageIcon,
  ScanSearchIcon,
  SearchIcon,
  TruckIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTranslation } from "@workspace/i18n/react";
import { cn } from "@workspace/ui/lib/utils";

import { MobileTabBar, MobileTabButton, MobileTabLink } from "@/components/mobile-tab-bar";
import { AuthManagerMenu } from "@/features/auth/auth-manager-menu";

// Unified web mobile bottom bar — shown on both the marketing landing and the
// shop routes. Five tabs: Home · Search · Order Now (prominent center) · Orders
// · Account. Cart deliberately lives only in the top header, never here.
export function MobileAdminBottomNav({ user }: { user: { name: string | null; role: string; phone: string | null } }) {
  const pathname = usePathname() ?? "/";
  const { t } = useTranslation();

  const ordersActive = pathname.startsWith("/admin/orders")

  return (
    <MobileTabBar ariaLabel={t("admin.mobileNavLabel")}>
      <MobileTabLink
        href="/admin"
        icon={LayoutDashboardIcon}
        label={t("admin.nav.dashboard")}
        active={pathname === "/admin"}
      />
      <MobileTabLink
        href="/admin/items/review"
        icon={ScanSearchIcon}
        label={t("admin.nav.review")}
        active={pathname.startsWith("/admin/items/review")}
      />

      {/* Order Now — prominent, raised center CTA */}
      <Link
        href="/admin/orders"
        aria-label={t("admin.nav.orders")}
        className="flex flex-col items-center justify-start gap-1 px-1 pt-1.5"
      >
        <span
          className={cn(
            "flex size-12 -translate-y-3 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95",
            ordersActive && "ring-2 ring-primary/40",
          )}
        >
          <ClipboardListIcon className="size-6" aria-hidden />
        </span>
        <span className="-mt-2.5 line-clamp-2 text-center text-[0.625rem] font-semibold leading-tight text-foreground">
          {t("admin.nav.orders")}
        </span>
      </Link>

      <MobileTabLink
        href="/admin/drivers"
        icon={TruckIcon}
        label={t("admin.nav.drivers")}
        active={pathname.startsWith("/admin/drivers")}
      />
      <div className="grid place-content-center">
        <AuthManagerMenu user={user}>
          <div
            className={cn(
              "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-[0.625rem] font-medium text-muted-foreground transition-colors",
              "hover:text-foreground active:bg-muted/60",
            )}
          >
            <UserIcon className="size-[1.35rem] shrink-0" aria-hidden />
            <span className="line-clamp-2 text-center leading-tight">{t("account.title")}</span>
          </div>
        </AuthManagerMenu>
      </div>
    </MobileTabBar>
  );
}
