"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { PhoneInput } from "@workspace/ui/components/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import { useTRPC } from "@/lib/trpc/client";

type Provider = "wapilot" | "twilio" | "console";

export default function AdminSettingsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // ── General settings ──────────────────────────────────────────────────────
  const getOptions = trpc.admin.settings.get.queryOptions();
  const { data } = useQuery(getOptions);

  const [deliveryFee, setDeliveryFee] = useState("");
  const [supportWhatsapp, setSupportWhatsapp] = useState("");
  const [saved, setSaved] = useState(false);

  // ── Store links ───────────────────────────────────────────────────────────
  const storeLinksOptions = trpc.admin.settings.getStoreLinks.queryOptions();
  const { data: storeLinksData } = useQuery(storeLinksOptions);

  const [playStoreUrl, setPlayStoreUrl] = useState("");
  const [appStoreUrl, setAppStoreUrl] = useState("");
  const [storeLinksSaved, setStoreLinksSaved] = useState(false);

  useEffect(() => {
    if (storeLinksData) {
      setPlayStoreUrl(storeLinksData.playStoreUrl ?? "");
      setAppStoreUrl(storeLinksData.appStoreUrl ?? "");
    }
  }, [storeLinksData]);

  const updateStoreLinks = useMutation(
    trpc.admin.settings.updateStoreLinks.mutationOptions({
      onSuccess: () => {
        setStoreLinksSaved(true);
        void queryClient.invalidateQueries({
          queryKey: storeLinksOptions.queryKey,
        });
      },
    }),
  );

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

  // ── WhatsApp integration ───────────────────────────────────────────────────
  const waOptions = trpc.admin.settings.getWhatsapp.queryOptions();
  const { data: waData } = useQuery(waOptions);

  const [provider, setProvider] = useState<Provider>("console");
  const [wapilotInstanceId, setWapilotInstanceId] = useState("");
  const [wapilotToken, setWapilotToken] = useState("");
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioFromNumber, setTwilioFromNumber] = useState("");
  const [whatsappSaved, setWhatsappSaved] = useState(false);

  useEffect(() => {
    if (waData?.provider) {
      setProvider(waData.provider);
    }
    // Credential inputs always start empty ("leave blank to keep current value")
  }, [waData]);

  const updateWhatsapp = useMutation(
    trpc.admin.settings.updateWhatsapp.mutationOptions({
      onSuccess: () => {
        setWhatsappSaved(true);
        void queryClient.invalidateQueries({ queryKey: waOptions.queryKey });
      },
    }),
  );

  function handleWhatsappSave() {
    setWhatsappSaved(false);
    updateWhatsapp.mutate({
      provider,
      wapilot:
        provider === "wapilot" && (wapilotInstanceId || wapilotToken)
          ? {
              instanceId: wapilotInstanceId,
              token: wapilotToken,
            }
          : undefined,
      twilio:
        provider === "twilio" &&
        (twilioAccountSid || twilioAuthToken || twilioFromNumber)
          ? {
              accountSid: twilioAccountSid,
              authToken: twilioAuthToken,
              fromNumber: twilioFromNumber,
            }
          : undefined,
    });
  }

  const wapilotConfigured = waData?.credentials.wapilot.configured ?? false;
  const twilioConfigured = waData?.credentials.twilio.configured ?? false;

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("admin.settings.title")}</h1>

      {/* General settings */}
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
            <PhoneInput
              id="whatsapp"
              value={supportWhatsapp}
              onChange={(v) => { setSaved(false); setSupportWhatsapp(v); }}
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

      {/* App store links */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.settings.storeLinks")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-xs">
            {t("admin.settings.storeLinksHint")}
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="play-store-url">
              {t("admin.settings.playStoreUrl")}
            </Label>
            <Input
              id="play-store-url"
              type="url"
              dir="ltr"
              value={playStoreUrl}
              onChange={(e) => {
                setStoreLinksSaved(false);
                setPlayStoreUrl(e.target.value);
              }}
              placeholder="https://play.google.com/store/apps/details?id=…"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="app-store-url">
              {t("admin.settings.appStoreUrl")}
            </Label>
            <Input
              id="app-store-url"
              type="url"
              dir="ltr"
              value={appStoreUrl}
              onChange={(e) => {
                setStoreLinksSaved(false);
                setAppStoreUrl(e.target.value);
              }}
              placeholder="https://apps.apple.com/app/…"
            />
          </div>
          {storeLinksSaved ? (
            <Alert>
              <AlertDescription>{t("admin.settings.saved")}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            disabled={updateStoreLinks.isPending}
            onClick={() => {
              setStoreLinksSaved(false);
              updateStoreLinks.mutate({ playStoreUrl, appStoreUrl });
            }}
          >
            {t("common.save")}
          </Button>
        </CardContent>
      </Card>

      {/* WhatsApp integration */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.settings.whatsappIntegration")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="wa-provider">
              {t("admin.settings.whatsappProviderLabel")}
            </Label>
            <p className="text-muted-foreground text-xs">
              {t("admin.settings.whatsappProviderHint")}
            </p>
            <Select
              value={provider}
              onValueChange={(v) => {
                if (!v) return;
                setWhatsappSaved(false);
                setProvider(v as Provider);
              }}
            >
              <SelectTrigger id="wa-provider" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="console">
                  {t("admin.settings.providerConsole")}
                </SelectItem>
                <SelectItem value="wapilot">
                  {t("admin.settings.providerWapilot")}
                </SelectItem>
                <SelectItem value="twilio">
                  {t("admin.settings.providerTwilio")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Masked credential status */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              {t("admin.settings.whatsappCredentials")}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Wapilot</span>
              <Badge variant={wapilotConfigured ? "default" : "secondary"}>
                {wapilotConfigured
                  ? t("admin.settings.credentialConfigured")
                  : t("admin.settings.credentialNotConfigured")}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Twilio</span>
              <Badge variant={twilioConfigured ? "default" : "secondary"}>
                {twilioConfigured
                  ? t("admin.settings.credentialConfigured")
                  : t("admin.settings.credentialNotConfigured")}
              </Badge>
            </div>
          </div>

          {/* Wapilot credential inputs */}
          {provider === "wapilot" && (
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground text-xs">
                {t("admin.settings.credentialUpdateHint")}
              </p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="wapilot-id">
                  {t("admin.settings.wapilotInstanceId")}
                </Label>
                <Input
                  id="wapilot-id"
                  dir="ltr"
                  value={wapilotInstanceId}
                  onChange={(e) => {
                    setWhatsappSaved(false);
                    setWapilotInstanceId(e.target.value);
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="wapilot-token">
                  {t("admin.settings.wapilotToken")}
                </Label>
                <Input
                  id="wapilot-token"
                  dir="ltr"
                  type="password"
                  value={wapilotToken}
                  onChange={(e) => {
                    setWhatsappSaved(false);
                    setWapilotToken(e.target.value);
                  }}
                />
              </div>
            </div>
          )}

          {/* Twilio credential inputs */}
          {provider === "twilio" && (
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground text-xs">
                {t("admin.settings.credentialUpdateHint")}
              </p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="twilio-sid">
                  {t("admin.settings.twilioAccountSid")}
                </Label>
                <Input
                  id="twilio-sid"
                  dir="ltr"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={twilioAccountSid}
                  onChange={(e) => {
                    setWhatsappSaved(false);
                    setTwilioAccountSid(e.target.value);
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="twilio-auth">
                  {t("admin.settings.twilioAuthToken")}
                </Label>
                <Input
                  id="twilio-auth"
                  dir="ltr"
                  type="password"
                  value={twilioAuthToken}
                  onChange={(e) => {
                    setWhatsappSaved(false);
                    setTwilioAuthToken(e.target.value);
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="twilio-from">
                  {t("admin.settings.twilioFromNumber")}
                </Label>
                <Input
                  id="twilio-from"
                  dir="ltr"
                  placeholder="+14155238886"
                  value={twilioFromNumber}
                  onChange={(e) => {
                    setWhatsappSaved(false);
                    setTwilioFromNumber(e.target.value);
                  }}
                />
              </div>
            </div>
          )}

          {whatsappSaved ? (
            <Alert>
              <AlertDescription>
                {t("admin.settings.whatsappSaved")}
              </AlertDescription>
            </Alert>
          ) : null}
          <Button
            disabled={updateWhatsapp.isPending}
            onClick={handleWhatsappSave}
          >
            {t("common.save")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
