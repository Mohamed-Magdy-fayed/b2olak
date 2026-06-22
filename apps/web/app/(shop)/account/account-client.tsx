"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { useTRPC } from "@/lib/trpc/client";
import { useAppForm } from "@/components/forms/hooks";
import { PhoneVerifyCard } from "@/features/shop/phone-verify-card";
import { signOutAction } from "@/features/auth/actions";

import { Badge } from "@workspace/ui/components/badge";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";

function ProfileNameForm({ initialName }: { initialName: string }) {
  const { t } = useTranslation();
  const trpc = useTRPC();

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

  const form = useAppForm({
    defaultValues: { name: initialName },
    onSubmit: async ({ value }) => {
      await updateProfile.mutateAsync({ name: value.name.trim() });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <form.AppField name="name">
        {(field) => <field.StringField label={t("account.nameLabel")} />}
      </form.AppField>
      <Button type="submit" disabled={updateProfile.isPending}>
        {updateProfile.isPending ? t("common.loading") : t("common.save")}
      </Button>
    </form>
  );
}

export function AccountClient() {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const deleteAccount = useMutation(
    trpc.auth.deleteAccount.mutationOptions({
      onSuccess: () => {
        router.push("/sign-in");
      },
      onError: () => {
        toast.error(t("errors.unknown"));
      },
    }),
  );

  const { data: meData, isLoading } = useQuery(trpc.auth.me.queryOptions());

  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const user = meData?.user;

  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .slice(0, 2)
        .join("")
    : "?";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/30">
          <span className="font-display text-2xl font-black text-primary">{initials}</span>
        </div>
        <h1 className="font-display text-2xl font-black text-foreground">{t("account.title")}</h1>
      </div>

      {/* Profile card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("account.profile")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ProfileNameForm initialName={user?.name ?? ""} />

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

      {/* Delete account */}
      <Button
        variant="ghost"
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => setShowDeleteDialog(true)}
      >
        {t("auth.deleteAccount")}
      </Button>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("auth.deleteAccountConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("auth.deleteAccountConfirmMessage")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteAccount.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAccount.mutate()}
              disabled={deleteAccount.isPending}
            >
              {deleteAccount.isPending ? t("common.loading") : t("auth.deleteAccountConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
