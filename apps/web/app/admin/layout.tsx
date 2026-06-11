import { redirect } from "next/navigation";

import { AdminNav } from "@/features/admin/admin-nav";
import { LanguageToggle } from "@/components/language-toggle";
import { signOutAction } from "@/features/auth/actions";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/i18n";

import { Button } from "@workspace/ui/components/button";

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
      <aside className="bg-sidebar flex w-56 shrink-0 flex-col border-e p-4">
        <div className="mb-6 flex items-center gap-2">
          <span className="text-xl font-black">{t("common.appName")}</span>
        </div>
        <AdminNav />
        <div className="mt-auto flex flex-col gap-2 pt-6">
          <LanguageToggle />
          <form action={signOutAction}>
            <Button variant="ghost" size="sm" type="submit" className="w-full">
              {t("auth.signOut")}
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden p-6">{children}</main>
    </div>
  );
}
