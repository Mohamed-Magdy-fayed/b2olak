import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { AccountSecurityClient } from "@/features/auth/account-security-client";

export default async function AccountSecurityPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/account/security");
  if (session.user.role === "admin") redirect("/admin");

  return <AccountSecurityClient />;
}
