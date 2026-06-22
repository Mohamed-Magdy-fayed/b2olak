import Image from "next/image";
import { redirect } from "next/navigation";

import { Button } from "@workspace/ui/components/button";

import { LanguageToggle } from "@/components/language-toggle";
import { signOutAction } from "@/features/auth/actions";
import { AdminMobileNav } from "@/features/admin/admin-mobile-nav";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { AdminBreadcrumb } from "@/features/admin/admin-breadcrumb";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { MobileTabBar, MobileTabLink } from "@/components/mobile-tab-bar";
import { LayoutDashboardIcon } from "lucide-react";
import { MobileAdminBottomNav } from "@/components/mobile-admin-bottom-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") redirect("/sign-in");

  const { t } = await getT();

  return (
    <div className="flex min-h-svh">
      {/* Desktop collapsible sidebar — hidden on mobile */}
      <AdminSidebar signOutLabel={t("auth.signOut")} appName={t("common.appName")} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur md:hidden">
          <AdminMobileNav />
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="ba2olak" width={28} height={28} className="size-7 rounded-lg" />
            <span className="font-display text-lg font-black text-primary">
              {t("common.appName")}
            </span>
          </div>
          <div className="ms-auto">
            <LanguageToggle />
          </div>
        </header>

        {/* Desktop page header with breadcrumb */}
        <header className="sticky top-0 z-30 hidden h-14 items-center border-b border-border bg-card/80 px-6 backdrop-blur md:flex">
          <AdminBreadcrumb />
          <div className="ms-auto flex items-center gap-2">
            <LanguageToggle />
            <form action={signOutAction}>
              <Button variant="ghost" size="sm" type="submit">
                {t("auth.signOut")}
              </Button>
            </form>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>

        <MobileAdminBottomNav user={session.user} />
      </div>
    </div>
  );
}
