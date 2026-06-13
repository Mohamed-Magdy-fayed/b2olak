import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { OrderDetailClient } from "./order-detail-client";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const { id } = await params;
  if (!session) redirect(`/sign-in?next=/orders/${id}`);

  return <OrderDetailClient orderId={id} />;
}
