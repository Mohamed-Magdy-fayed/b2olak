import Link from "next/link";

import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button, buttonVariants } from "@workspace/ui/components/button";

import { HealthBadge } from "@/components/health-badge";
import { LanguageToggle } from "@/components/language-toggle";
import { signOutAction } from "@/features/auth/actions";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export default async function Page() {
  const { t } = await getT();
  const session = await getSession();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <header className="absolute inset-e-6 top-6 flex items-center gap-3">
        <LanguageToggle />
        {session ? (
          <form action={signOutAction}>
            <Button variant="outline" size="sm" type="submit">
              {t("auth.signOut")}
            </Button>
          </form>
        ) : (
          <Link
            href="/sign-in"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("auth.signIn")}
          </Link>
        )}
      </header>

      <main className="flex max-w-md flex-col items-center gap-4 text-center">
        <h1 className="text-5xl font-black tracking-tight">
          {t("common.appName")}
        </h1>
        <p className="text-xl font-semibold">{t("home.tagline")}</p>
        <p className="text-muted-foreground">{t("home.subtitle")}</p>
        <HealthBadge />
        {session ? (
          <p className="text-sm font-medium">
            {t("auth.signedInAs", {
              name: session.user.name ?? session.user.email ?? "—",
              role: session.user.role,
            })}
          </p>
        ) : null}
        <Alert>
          <AlertDescription>{t("home.phaseBanner")}</AlertDescription>
        </Alert>
      </main>
    </div>
  );
}
