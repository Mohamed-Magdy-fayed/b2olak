import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetTrigger,
} from "@workspace/ui/components/sheet";

import { UserMenu } from "@/features/auth/user-menu";
import { LanguageToggle } from "@/components/language-toggle";
import { CartButton } from "@/features/shop/cart-button";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { mobileTabBarSpacerClassName } from "@/components/mobile-tab-bar";
import { AnalyticsScripts } from "@/lib/analytics";
import { ScrollToTop } from "@/components/scroll-to-top";
import { getT } from "@/lib/i18n";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = await getT();
  const year = String(new Date().getFullYear());

  return (
    <div className="flex min-h-svh flex-col">
      <AnalyticsScripts />

      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/" aria-label={t("common.appName")}>
            <Image
              src="/logo-mark.png"
              alt={t("common.appName")}
              width={36}
              height={36}
              className="size-9"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 md:flex">
            <LanguageToggle />
            <UserMenu />
            <Link
              href="/#download"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {t("landing.nav.download")}
            </Link>
            <Link href="/shop" className={buttonVariants({ size: "sm" })}>
              {t("landing.nav.orderNow")}
            </Link>
          </nav>

          {/* Mobile nav */}
          <div className="flex items-center gap-1 md:hidden">
            <CartButton />
            <LanguageToggle />
            <UserMenu />
            <Sheet>
              <SheetTrigger
                aria-label={t("common.menu")}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <line x1="4" x2="20" y1="6" y2="6" />
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetBody className="flex flex-col gap-3 pt-8">
                  <Link
                    href="/#download"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    {t("landing.nav.download")}
                  </Link>
                  <Link
                    href="/shop"
                    className={buttonVariants({ size: "sm" })}
                  >
                    {t("landing.nav.orderNow")}
                  </Link>
                </SheetBody>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className={`flex-1 ${mobileTabBarSpacerClassName}`}>{children}</main>

      <footer className="border-t pb-24 pt-8">
        <div className="text-muted-foreground mx-auto flex w-full max-w-5xl flex-col items-center gap-3 px-4 text-sm">
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground">
              {t("landing.footer.privacy")}
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              {t("landing.footer.terms")}
            </Link>
          </div>
          <p>{t("landing.footer.rights", { year })}</p>
        </div>
      </footer>

      <ScrollToTop />

      {/* Mobile bottom tab bar */}
      <MobileBottomNav />
    </div>
  );
}
