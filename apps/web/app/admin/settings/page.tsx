"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTranslation } from "@workspace/i18n/react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { PhoneInput } from "@workspace/ui/components/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import { EntityPageHeader } from "@/features/core/data-table";
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

  useEffect(() => {
    if (data) {
      setDeliveryFee(String(data.deliveryFeeEgp));
      setSupportWhatsapp(data.supportWhatsappNumber);
    }
  }, [data]);

  const update = useMutation(
    trpc.admin.settings.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getOptions.queryKey });
        toast.success(String(t("admin.settings.saved")));
      },
    }),
  );

  // ── Store links ───────────────────────────────────────────────────────────
  const storeLinksOptions = trpc.admin.settings.getStoreLinks.queryOptions();
  const { data: storeLinksData } = useQuery(storeLinksOptions);

  const [playStoreUrl, setPlayStoreUrl] = useState("");
  const [appStoreUrl, setAppStoreUrl] = useState("");

  useEffect(() => {
    if (storeLinksData) {
      setPlayStoreUrl(storeLinksData.playStoreUrl ?? "");
      setAppStoreUrl(storeLinksData.appStoreUrl ?? "");
    }
  }, [storeLinksData]);

  const updateStoreLinks = useMutation(
    trpc.admin.settings.updateStoreLinks.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: storeLinksOptions.queryKey,
        });
        toast.success(String(t("admin.settings.saved")));
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

  useEffect(() => {
    if (waData?.provider) {
      setProvider(waData.provider);
    }
    // Credential inputs always start empty ("leave blank to keep current value")
  }, [waData]);

  const updateWhatsapp = useMutation(
    trpc.admin.settings.updateWhatsapp.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: waOptions.queryKey });
        toast.success(String(t("admin.settings.whatsappSaved")));
      },
    }),
  );

  function handleWhatsappSave() {
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
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <EntityPageHeader
        title={String(t("admin.settings.title"))}
        lead={String(t("admin.settings.lead"))}
      />

      {/* ── General settings ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{String(t("admin.settings.title"))}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="fee">
              {String(t("admin.settings.deliveryFee"))}
            </FieldLabel>
            <Input
              id="fee"
              type="number"
              dir="ltr"
              min={0}
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
            />
            <FieldDescription>
              {String(t("admin.settings.deliveryFeeHint"))}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="support-whatsapp">
              {String(t("admin.settings.supportWhatsapp"))}
            </FieldLabel>
            <PhoneInput
              id="support-whatsapp"
              value={supportWhatsapp}
              onChange={(v) => setSupportWhatsapp(v)}
            />
          </Field>

          <div className="flex justify-end pt-2">
            <Button
              disabled={update.isPending}
              onClick={() =>
                update.mutate({
                  deliveryFeeEgp: Number(deliveryFee) || 0,
                  supportWhatsappNumber: supportWhatsapp,
                })
              }
            >
              {String(t("common.save"))}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── App store links ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{String(t("admin.settings.storeLinks"))}</CardTitle>
          <CardDescription>
            {String(t("admin.settings.storeLinksHint"))}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="play-store-url">
              {String(t("admin.settings.playStoreUrl"))}
            </FieldLabel>
            <Input
              id="play-store-url"
              type="url"
              dir="ltr"
              value={playStoreUrl}
              onChange={(e) => setPlayStoreUrl(e.target.value)}
              placeholder="https://play.google.com/store/apps/details?id=…"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="app-store-url">
              {String(t("admin.settings.appStoreUrl"))}
            </FieldLabel>
            <Input
              id="app-store-url"
              type="url"
              dir="ltr"
              value={appStoreUrl}
              onChange={(e) => setAppStoreUrl(e.target.value)}
              placeholder="https://apps.apple.com/app/…"
            />
          </Field>

          <div className="flex justify-end pt-2">
            <Button
              disabled={updateStoreLinks.isPending}
              onClick={() =>
                updateStoreLinks.mutate({ playStoreUrl, appStoreUrl })
              }
            >
              {String(t("common.save"))}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── WhatsApp integration ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            {String(t("admin.settings.whatsappIntegration"))}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider select */}
          <Field>
            <FieldLabel htmlFor="wa-provider">
              {String(t("admin.settings.whatsappProviderLabel"))}
            </FieldLabel>
            <FieldDescription>
              {String(t("admin.settings.whatsappProviderHint"))}
            </FieldDescription>
            <Select
              value={provider}
              onValueChange={(v) => {
                if (!v) return;
                setProvider(v as Provider);
              }}
            >
              <SelectTrigger id="wa-provider" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="console">
                  {String(t("admin.settings.providerConsole"))}
                </SelectItem>
                <SelectItem value="wapilot">
                  {String(t("admin.settings.providerWapilot"))}
                </SelectItem>
                <SelectItem value="twilio">
                  {String(t("admin.settings.providerTwilio"))}
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Credential status badges */}
          <Field>
            <FieldLabel>
              {String(t("admin.settings.whatsappCredentials"))}
            </FieldLabel>
            <div className="flex flex-wrap gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">Wapilot</span>
                <Badge variant={wapilotConfigured ? "default" : "secondary"}>
                  {wapilotConfigured
                    ? String(t("admin.settings.credentialConfigured"))
                    : String(t("admin.settings.credentialNotConfigured"))}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">Twilio</span>
                <Badge variant={twilioConfigured ? "default" : "secondary"}>
                  {twilioConfigured
                    ? String(t("admin.settings.credentialConfigured"))
                    : String(t("admin.settings.credentialNotConfigured"))}
                </Badge>
              </div>
            </div>
          </Field>

          {/* Wapilot credential inputs */}
          {provider === "wapilot" && (
            <div className="space-y-4">
              <FieldDescription>
                {String(t("admin.settings.credentialUpdateHint"))}
              </FieldDescription>
              <Field>
                <FieldLabel htmlFor="wapilot-id">
                  {String(t("admin.settings.wapilotInstanceId"))}
                </FieldLabel>
                <Input
                  id="wapilot-id"
                  dir="ltr"
                  value={wapilotInstanceId}
                  onChange={(e) => setWapilotInstanceId(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="wapilot-token">
                  {String(t("admin.settings.wapilotToken"))}
                </FieldLabel>
                <Input
                  id="wapilot-token"
                  dir="ltr"
                  type="password"
                  value={wapilotToken}
                  onChange={(e) => setWapilotToken(e.target.value)}
                />
              </Field>
            </div>
          )}

          {/* Twilio credential inputs */}
          {provider === "twilio" && (
            <div className="space-y-4">
              <FieldDescription>
                {String(t("admin.settings.credentialUpdateHint"))}
              </FieldDescription>
              <Field>
                <FieldLabel htmlFor="twilio-sid">
                  {String(t("admin.settings.twilioAccountSid"))}
                </FieldLabel>
                <Input
                  id="twilio-sid"
                  dir="ltr"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={twilioAccountSid}
                  onChange={(e) => setTwilioAccountSid(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="twilio-auth">
                  {String(t("admin.settings.twilioAuthToken"))}
                </FieldLabel>
                <Input
                  id="twilio-auth"
                  dir="ltr"
                  type="password"
                  value={twilioAuthToken}
                  onChange={(e) => setTwilioAuthToken(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="twilio-from">
                  {String(t("admin.settings.twilioFromNumber"))}
                </FieldLabel>
                <Input
                  id="twilio-from"
                  dir="ltr"
                  placeholder="+14155238886"
                  value={twilioFromNumber}
                  onChange={(e) => setTwilioFromNumber(e.target.value)}
                />
              </Field>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              disabled={updateWhatsapp.isPending}
              onClick={handleWhatsappSave}
            >
              {String(t("common.save"))}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
