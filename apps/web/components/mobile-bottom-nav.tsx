"use client";

import {
  HomeIcon,
  PackageIcon,
  SearchIcon,
  ShoppingBagIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTranslation } from "@workspace/i18n/react";
import { cn } from "@workspace/ui/lib/utils";

import { MobileTabBar, MobileTabLink } from "@/components/mobile-tab-bar";

// Unified web mobile bottom bar — shown on both the marketing landing and the
// shop routes. Five tabs: Home · Search · Order Now (prominent center) · Orders
// · Account. Cart deliberately lives only in the top header, never here.
export function MobileBottomNav() {
  const pathname = usePathname() ?? "/";
  const { t } = useTranslation();

  // The center CTA owns the whole shopping flow (hub, categories, cart, checkout).
  const orderNowActive =
    pathname === "/shop" ||
    pathname.startsWith("/shop/category") ||
    pathname === "/cart" ||
    pathname === "/checkout";

  return (
    <MobileTabBar ariaLabel={t("shop.mobileNavLabel")} columnCount={5}>
      <MobileTabLink
        href="/"
        icon={HomeIcon}
        label={t("shop.tabHome")}
        active={pathname === "/"}
      />
      <MobileTabLink
        href="/shop/search"
        icon={SearchIcon}
        label={t("shop.tabSearch")}
        active={pathname.startsWith("/shop/search")}
      />

      {/* Order Now — prominent, raised center CTA */}
      <Link
        href="/shop"
        aria-label={t("shop.tabOrderNow")}
        className="flex flex-col items-center justify-start gap-1 px-1 pt-1.5"
      >
        <span
          className={cn(
            "flex size-12 -translate-y-3 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95",
            orderNowActive && "ring-2 ring-primary/40",
          )}
        >
          <ShoppingBagIcon className="size-6" aria-hidden />
        </span>
        <span className="-mt-2.5 line-clamp-2 text-center text-[0.625rem] font-semibold leading-tight text-foreground">
          {t("shop.tabOrderNow")}
        </span>
      </Link>

      <MobileTabLink
        href="/orders"
        icon={PackageIcon}
        label={t("shop.tabOrders")}
        active={pathname.startsWith("/orders")}
      />
      <MobileTabLink
        href="/account"
        icon={UserIcon}
        label={t("shop.tabAccount")}
        active={pathname.startsWith("/account")}
      />
    </MobileTabBar>
  );
}
