import Link from "next/link";

import { buttonVariants } from "@workspace/ui/components/button";

import { LanguageToggle } from "@/components/language-toggle";
import { UserMenu } from "@/features/auth/user-menu";
import { CartButton } from "@/features/shop/cart-button";
import { HeaderSearch } from "@/features/shop/header-search";
import { getT } from "@/lib/i18n";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = await getT();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-2 px-4">
          <Link href="/" aria-label={t("common.appName")} className="shrink-0 text-2xl font-black text-primary">
            {t("common.appName")}
          </Link>

          {/* Always-visible search in header */}
          <div className="flex-1">
            <HeaderSearch />
          </div>

          <nav className="flex shrink-0 items-center gap-1">
            <Link
              href="/shop"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {t("shop.tabHome")}
            </Link>
            <CartButton />
            <LanguageToggle />
            <UserMenu />
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
