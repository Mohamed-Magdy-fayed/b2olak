import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { buttonVariants } from "@workspace/ui/components/button";
import { CheckoutClient } from "./checkout-client";

export default async function CheckoutPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/checkout");

  const { t } = await getT();

  if (session.user.role !== "customer") {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>{t("shop.adminCannotOrder")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/" className={buttonVariants({ variant: "default" })}>
              {t("common.appName")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <CheckoutClient />;
}
