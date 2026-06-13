import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { AccountClient } from "./account-client";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/account");
  if (session.user.role === "admin") redirect("/admin");

  return <AccountClient />;
}
