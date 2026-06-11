import Link from "next/link";

import { buttonVariants } from "@workspace/ui/components/button";

import { LanguageToggle } from "@/components/language-toggle";
import { AnalyticsScripts } from "@/lib/analytics";
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
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/" className="text-2xl font-black text-primary">
            {t("common.appName")}
          </Link>
          <nav className="flex items-center gap-2">
            <LanguageToggle />
            <Link
              href="/sign-in"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {t("landing.nav.signIn")}
            </Link>
            <Link
              href="#download"
              className={buttonVariants({ size: "sm" })}
            >
              {t("landing.nav.download")}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t py-8">
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
    </div>
  );
}
