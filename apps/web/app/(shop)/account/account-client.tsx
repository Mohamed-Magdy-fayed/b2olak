"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { useTRPC } from "@/lib/trpc/client";
import { PhoneVerifyCard } from "@/features/shop/phone-verify-card";
import { signOutAction } from "@/features/auth/actions";

import { Badge } from "@workspace/ui/components/badge";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function AccountClient() {
  const { t } = useTranslation();
  const trpc = useTRPC();

  const { data: meData, isLoading } = useQuery(trpc.auth.me.queryOptions());

  const updateProfile = useMutation(
    trpc.auth.updateProfile.mutationOptions({
      onSuccess: () => {
        toast.success(t("account.saved"));
      },
      onError: () => {
        toast.error(t("errors.unknown"));
      },
    }),
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const user = meData?.user;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-black text-foreground">{t("account.title")}</h1>

      {/* Profile card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("account.profile")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              updateProfile.mutate({ name: String(fd.get("name") ?? "") });
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-name">{t("account.nameLabel")}</Label>
              <Input
                id="account-name"
                name="name"
                defaultValue={user?.name ?? ""}
              />
            </div>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? t("common.loading") : t("common.save")}
            </Button>
          </form>

          {/* Phone status */}
          <div className="flex items-center gap-2 border-t border-border pt-4">
            <span className="text-sm text-foreground">
              {user?.phone ?? t("mobile.phoneLabel")}
            </span>
            {user?.phone ? (
              <Badge variant="success">{t("account.phoneLinked")}</Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Phone verify if no phone */}
      {!user?.phone && <PhoneVerifyCard />}

      {/* Addresses link */}
      <Link
        href="/account/addresses"
        className={buttonVariants({ variant: "outline" })}
      >
        {t("address.title")}
      </Link>

      {/* Security link */}
      <Link
        href="/account/security"
        className={buttonVariants({ variant: "outline" })}
      >
        <ShieldCheck className="size-4" />
        <span className="flex flex-col items-start gap-0.5 text-start">
          <span>{t("account.security" as never)}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {t("account.securityHint" as never)}
          </span>
        </span>
      </Link>

      {/* Sign out */}
      <form action={signOutAction}>
        <Button type="submit" variant="destructive" className="w-full">
          {t("auth.signOut")}
        </Button>
      </form>
    </div>
  );
}
