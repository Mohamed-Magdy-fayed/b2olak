import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { AddressesClient } from "./addresses-client";

export default async function AddressesPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/account/addresses");
  if (session.user.role === "admin") redirect("/admin");

  return <AddressesClient />;
}
