"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { useTRPC } from "@/lib/trpc/client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";

/**
 * Trusted-device management for the auth manager: list devices that can sign in
 * without OTP, revoke any of them, and sign out of every active session.
 */
export function DevicesManager() {
  const { t, locale } = useTranslation();
  const trpc = useTRPC();
  const router = useRouter();

  const { data: devices, isLoading, refetch } = useQuery(
    trpc.auth.listDevices.queryOptions(),
  );

  const revokeDevice = useMutation(
    trpc.auth.revokeDevice.mutationOptions({
      onSuccess: () => {
        void refetch();
        setRevokeId(null);
      },
      onError: () => toast.error(t("errors.unknown" as never)),
    }),
  );

  const signOutEverywhere = useMutation(
    trpc.auth.signOutEverywhere.mutationOptions({
      onSuccess: () => router.push("/sign-in"),
      onError: () => toast.error(t("errors.unknown" as never)),
    }),
  );

  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [signOutAllOpen, setSignOutAllOpen] = useState(false);

  function formatDate(date: Date | string | null) {
    if (!date) return null;
    return new Date(date).toLocaleDateString(locale);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("account.devices.title" as never)}</CardTitle>
          <CardDescription>{t("account.devices.hint" as never)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
            </div>
          ) : devices && devices.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {devices.map((d) => (
                <li
                  key={d.deviceId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium text-foreground">
                      {d.label ?? t("account.devices.defaultLabel" as never)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {d.lastUsedAt
                        ? (t as (k: string, a: Record<string, unknown>) => string)(
                            "account.devices.lastUsed",
                            { date: formatDate(d.lastUsedAt) },
                          )
                        : (t as (k: string, a: Record<string, unknown>) => string)(
                            "account.devices.added",
                            { date: formatDate(d.createdAt) },
                          )}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => setRevokeId(d.deviceId)}
                  >
                    {t("account.devices.revoke" as never)}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("account.devices.none" as never)}
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={() => setSignOutAllOpen(true)}
          >
            {t("account.devices.signOutEverywhere" as never)}
          </Button>
        </CardContent>
      </Card>

      {/* Revoke confirm */}
      <Dialog
        open={revokeId !== null}
        onOpenChange={(open) => !open && setRevokeId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("account.devices.revoke" as never)}</DialogTitle>
            <DialogDescription>
              {t("account.devices.revokeConfirm" as never)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevokeId(null)}>
              {t("common.cancel" as never)}
            </Button>
            <Button
              variant="destructive"
              disabled={revokeDevice.isPending}
              onClick={() => revokeId && revokeDevice.mutate({ deviceId: revokeId })}
            >
              {revokeDevice.isPending
                ? t("common.loading" as never)
                : t("account.devices.revoke" as never)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign out everywhere confirm */}
      <Dialog open={signOutAllOpen} onOpenChange={setSignOutAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("account.devices.signOutEverywhere" as never)}
            </DialogTitle>
            <DialogDescription>
              {t("account.devices.signOutEverywhereConfirm" as never)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSignOutAllOpen(false)}>
              {t("common.cancel" as never)}
            </Button>
            <Button
              variant="destructive"
              disabled={signOutEverywhere.isPending}
              onClick={() => signOutEverywhere.mutate()}
            >
              {signOutEverywhere.isPending
                ? t("common.loading" as never)
                : t("account.devices.signOutEverywhere" as never)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
