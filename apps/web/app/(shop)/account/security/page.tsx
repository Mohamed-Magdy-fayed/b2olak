import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { AccountSecurityClient } from "@/features/auth/account-security-client";
import { DevicesManager } from "@/features/auth/devices-manager";

export default async function AccountSecurityPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/account/security");
  if (session.user.role === "admin") redirect("/admin");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8">
      <AccountSecurityClient />
      <DevicesManager />
    </div>
  );
}
