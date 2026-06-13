import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { OrdersClient } from "./orders-client";

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/orders");
  if (session.user.role === "admin") redirect("/admin");

  return <OrdersClient />;
}
