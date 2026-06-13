import Link from "next/link";
import { LogOut } from "lucide-react";

import { Button, buttonVariants } from "@workspace/ui/components/button";

import { signOutAction } from "@/features/auth/actions";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/i18n";

/**
 * Session-aware nav fragment for the marketing/shop headers. Signed-out users
 * get the sign-in link; signed-in users get their area link + sign-out.
 */
export async function UserMenu() {
  const { t } = await getT();
  const session = await getSession();

  if (!session) {
    return (
      <Link
        href="/sign-in"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        {t("landing.nav.signIn")}
      </Link>
    );
  }

  const { user } = session;
  const areaHref = user.role === "admin" ? "/admin" : "/account";
  const areaLabel =
    user.role === "admin" ? t("admin.title") : t("shop.tabAccount");

  return (
    <div className="flex items-center gap-1">
      <Link
        href={areaHref}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        {user.name ?? areaLabel}
      </Link>
      <form action={signOutAction}>
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label={t("auth.signOut")}
        >
          <LogOut className="size-4 rtl:rotate-180" aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}
