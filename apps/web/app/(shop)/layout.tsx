import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";

import { buttonVariants } from "@workspace/ui/components/button";

import { LanguageToggle } from "@/components/language-toggle";
import { UserMenu } from "@/features/auth/user-menu";
import { CartButton } from "@/features/shop/cart-button";
import { HeaderSearch } from "@/features/shop/header-search";
import { mobileTabBarSpacerClassName } from "@/components/mobile-tab-bar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { getT } from "@/lib/i18n";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = await getT();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-2 px-4">
          {/* Brand */}
          <Link
            href="/"
            aria-label={t("common.appName")}
            className="flex shrink-0 items-center gap-2"
          >
            <Image src="/logo.png" alt="ba2olak logo" width={32} height={32} className="size-8 rounded-lg" />
            <span className="font-display text-xl font-black text-primary">{t("common.appName")}</span>
          </Link>

          {/* Search bar — desktop only */}
          <div className="hidden flex-1 sm:block">
            <HeaderSearch />
          </div>

          <div className="ms-auto flex shrink-0 items-center gap-1">
            {/* Search icon — mobile only, routes to search page */}
            <Link
              href="/shop/search"
              aria-label={t("shop.tabSearch")}
              className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:hidden"
            >
              <Search className="size-5" aria-hidden />
            </Link>

            <CartButton />

            {/* Home link — desktop only */}
            <Link
              href="/shop"
              className={`hidden md:inline-flex ${buttonVariants({ variant: "ghost", size: "sm" })}`}
            >
              {t("shop.tabHome")}
            </Link>

            <LanguageToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className={`flex-1 pb-16 ${mobileTabBarSpacerClassName}`}>{children}</main>

      {/* Mobile bottom tab bar */}
      <MobileBottomNav />
    </div>
  );
}
