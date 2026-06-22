import Link from "next/link";

import { buttonVariants } from "@workspace/ui/components/button";

import { AuthManagerMenu } from "@/features/auth/auth-manager-menu";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/i18n";

/**
 * Session-aware nav fragment for the marketing/shop headers. Signed-out users
 * get the sign-in link; signed-in users get the unified auth-manager menu.
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

  return (
    <AuthManagerMenu
      user={{ name: user.name, role: user.role, phone: user.phone }}
    />
  );
}
