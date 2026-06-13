"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { browserSupportsWebAuthn } from "@simplewebauthn/browser";

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
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { PasskeyEnrollButton } from "./passkey-enroll-button";

export function AccountSecurityClient() {
  const { t, locale } = useTranslation();
  const trpc = useTRPC();

  const { data: passkeys, isLoading, refetch } = useQuery(
    trpc.auth.listPasskeys.queryOptions(),
  );

  const renamePasskey = useMutation(
    trpc.auth.renamePasskey.mutationOptions({
      onSuccess: () => {
        void refetch();
        setRenameDialogId(null);
      },
      onError: () => {
        toast.error(t("errors.unknown" as never));
      },
    }),
  );

  const deletePasskey = useMutation(
    trpc.auth.deletePasskey.mutationOptions({
      onSuccess: () => {
        void refetch();
        setDeleteDialogId(null);
      },
      onError: () => {
        toast.error(t("errors.unknown" as never));
      },
    }),
  );

  const [renameDialogId, setRenameDialogId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);

  function openRename(id: string, currentLabel: string | null) {
    setRenameValue(currentLabel ?? "");
    setRenameDialogId(id);
  }

  function formatDate(date: Date | string | null) {
    if (!date) return null;
    return new Date(date).toLocaleDateString(locale);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("auth.passkey.title" as never)}</CardTitle>
          <CardDescription>{t("account.securityHint" as never)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
            </div>
          ) : passkeys && passkeys.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {passkeys.map((pk) => (
                <li
                  key={pk.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {pk.label ?? t("auth.passkey.defaultLabel" as never)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {pk.lastUsedAt
                        ? (t as (k: string, a: Record<string, unknown>) => string)(
                            "auth.passkey.lastUsed",
                            { date: formatDate(pk.lastUsedAt) },
                          )
                        : (t as (k: string, a: Record<string, unknown>) => string)(
                            "auth.passkey.created",
                            { date: formatDate(pk.createdAt) },
                          )}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openRename(pk.id, pk.label ?? null)}
                    >
                      {t("auth.passkey.rename" as never)}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteDialogId(pk.id)}
                    >
                      {t("auth.passkey.delete" as never)}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("auth.passkey.noPasskeys" as never)}
            </p>
          )}

          {!browserSupportsWebAuthn() ? (
            <p className="text-sm text-muted-foreground">
              {t("auth.passkey.notSupported" as never)}
            </p>
          ) : (
            <PasskeyEnrollButton
              onEnrolled={() => void refetch()}
              variant="outline"
              className="w-full"
            />
          )}
        </CardContent>
      </Card>

      {/* Rename dialog */}
      <Dialog
        open={renameDialogId !== null}
        onOpenChange={(open) => !open && setRenameDialogId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("auth.passkey.renameTitle" as never)}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Label htmlFor="passkey-label">
              {t("auth.passkey.defaultLabel" as never)}
            </Label>
            <Input
              id="passkey-label"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder={t("auth.passkey.labelPlaceholder" as never)}
              maxLength={64}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRenameDialogId(null)}
            >
              {t("common.cancel" as never)}
            </Button>
            <Button
              type="button"
              disabled={renamePasskey.isPending || !renameValue.trim()}
              onClick={() => {
                if (renameDialogId) {
                  renamePasskey.mutate({
                    id: renameDialogId,
                    label: renameValue.trim(),
                  });
                }
              }}
            >
              {renamePasskey.isPending
                ? t("common.loading" as never)
                : t("common.save" as never)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={deleteDialogId !== null}
        onOpenChange={(open) => !open && setDeleteDialogId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("auth.passkey.delete" as never)}</DialogTitle>
            <DialogDescription>
              {t("auth.passkey.deleteConfirm" as never)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteDialogId(null)}
            >
              {t("common.cancel" as never)}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletePasskey.isPending}
              onClick={() => {
                if (deleteDialogId) {
                  deletePasskey.mutate({ id: deleteDialogId });
                }
              }}
            >
              {deletePasskey.isPending
                ? t("common.loading" as never)
                : t("auth.passkey.delete" as never)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
