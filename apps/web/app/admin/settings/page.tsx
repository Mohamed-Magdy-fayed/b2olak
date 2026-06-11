"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import { useTRPC } from "@/lib/trpc/client";

export default function AdminSettingsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const getOptions = trpc.admin.settings.get.queryOptions();
  const { data } = useQuery(getOptions);

  const [deliveryFee, setDeliveryFee] = useState("");
  const [supportWhatsapp, setSupportWhatsapp] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setDeliveryFee(String(data.deliveryFeeEgp));
      setSupportWhatsapp(data.supportWhatsappNumber);
    }
  }, [data]);

  const update = useMutation(
    trpc.admin.settings.update.mutationOptions({
      onSuccess: () => {
        setSaved(true);
        void queryClient.invalidateQueries({ queryKey: getOptions.queryKey });
      },
    }),
  );

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("admin.settings.title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.settings.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fee">{t("admin.settings.deliveryFee")}</Label>
            <Input
              id="fee"
              type="number"
              dir="ltr"
              min={0}
              value={deliveryFee}
              onChange={(e) => {
                setSaved(false);
                setDeliveryFee(e.target.value);
              }}
            />
            <p className="text-muted-foreground text-xs">
              {t("admin.settings.deliveryFeeHint")}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="whatsapp">
              {t("admin.settings.supportWhatsapp")}
            </Label>
            <Input
              id="whatsapp"
              dir="ltr"
              placeholder="+201001234567"
              value={supportWhatsapp}
              onChange={(e) => {
                setSaved(false);
                setSupportWhatsapp(e.target.value);
              }}
            />
          </div>
          {saved ? (
            <Alert>
              <AlertDescription>{t("admin.settings.saved")}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            disabled={update.isPending}
            onClick={() =>
              update.mutate({
                deliveryFeeEgp: Number(deliveryFee) || 0,
                supportWhatsappNumber: supportWhatsapp,
              })
            }
          >
            {t("common.save")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
