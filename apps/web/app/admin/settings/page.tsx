"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-form";
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
import { Field, FieldLabel } from "@workspace/ui/components/field";

import { EntityPageHeader } from "@/features/core/data-table";
import { useTRPC } from "@/lib/trpc/client";
import { useAppForm } from "@/components/forms/hooks";

type Provider = "wapilot" | "twilio" | "console";

// ── General settings ────────────────────────────────────────────────────────
function GeneralSettingsForm({
  initial,
  onSaved,
}: {
  initial: { deliveryFeeEgp: number; supportWhatsappNumber: string };
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const trpc = useTRPC();

  const update = useMutation(
    trpc.admin.settings.update.mutationOptions({
      onSuccess: () => {
        onSaved();
        toast.success(String(t("admin.settings.saved")));
      },
    }),
  );

  const form = useAppForm({
    defaultValues: {
      deliveryFeeEgp: initial.deliveryFeeEgp as number | null,
      supportWhatsappNumber: initial.supportWhatsappNumber,
    },
    onSubmit: async ({ value }) => {
      await update.mutateAsync({
        deliveryFeeEgp: value.deliveryFeeEgp ?? 0,
        supportWhatsappNumber: value.supportWhatsappNumber,
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{String(t("admin.settings.title"))}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.AppField name="deliveryFeeEgp">
            {(field) => (
              <field.NumberField
                label={String(t("admin.settings.deliveryFee"))}
                description={String(t("admin.settings.deliveryFeeHint"))}
              />
            )}
          </form.AppField>

          <form.AppField name="supportWhatsappNumber">
            {(field) => (
              <field.PhoneField
                label={String(t("admin.settings.supportWhatsapp"))}
              />
            )}
          </form.AppField>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={update.isPending}>
              {String(t("common.save"))}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── App store links ─────────────────────────────────────────────────────────
function StoreLinksForm({
  initial,
  onSaved,
}: {
  initial: { playStoreUrl: string; appStoreUrl: string };
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const trpc = useTRPC();

  const updateStoreLinks = useMutation(
    trpc.admin.settings.updateStoreLinks.mutationOptions({
      onSuccess: () => {
        onSaved();
        toast.success(String(t("admin.settings.saved")));
      },
    }),
  );

  const form = useAppForm({
    defaultValues: {
      playStoreUrl: initial.playStoreUrl,
      appStoreUrl: initial.appStoreUrl,
    },
    onSubmit: async ({ value }) => {
      await updateStoreLinks.mutateAsync(value);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{String(t("admin.settings.storeLinks"))}</CardTitle>
        <CardDescription>
          {String(t("admin.settings.storeLinksHint"))}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.AppField name="playStoreUrl">
            {(field) => (
              <field.StringField
                label={String(t("admin.settings.playStoreUrl"))}
                inputType="url"
                className="text-start"
                placeholder="https://play.google.com/store/apps/details?id=…"
              />
            )}
          </form.AppField>

          <form.AppField name="appStoreUrl">
            {(field) => (
              <field.StringField
                label={String(t("admin.settings.appStoreUrl"))}
                inputType="url"
                className="text-start"
                placeholder="https://apps.apple.com/app/…"
              />
            )}
          </form.AppField>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={updateStoreLinks.isPending}>
              {String(t("common.save"))}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── WhatsApp integration ─────────────────────────────────────────────────────
function WhatsappForm({
  initialProvider,
  wapilotConfigured,
  twilioConfigured,
  onSaved,
}: {
  initialProvider: Provider;
  wapilotConfigured: boolean;
  twilioConfigured: boolean;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const trpc = useTRPC();

  const updateWhatsapp = useMutation(
    trpc.admin.settings.updateWhatsapp.mutationOptions({
      onSuccess: () => {
        onSaved();
        toast.success(String(t("admin.settings.whatsappSaved")));
      },
    }),
  );

  const form = useAppForm({
    defaultValues: {
      provider: initialProvider,
      wapilotInstanceId: "",
      wapilotToken: "",
      twilioAccountSid: "",
      twilioAuthToken: "",
      twilioFromNumber: "",
    },
    onSubmit: async ({ value }) => {
      await updateWhatsapp.mutateAsync({
        provider: value.provider,
        wapilot:
          value.provider === "wapilot" &&
          (value.wapilotInstanceId || value.wapilotToken)
            ? {
                instanceId: value.wapilotInstanceId,
                token: value.wapilotToken,
              }
            : undefined,
        twilio:
          value.provider === "twilio" &&
          (value.twilioAccountSid ||
            value.twilioAuthToken ||
            value.twilioFromNumber)
            ? {
                accountSid: value.twilioAccountSid,
                authToken: value.twilioAuthToken,
                fromNumber: value.twilioFromNumber,
              }
            : undefined,
      });
    },
  });

  const provider = useStore(form.baseStore, (s) => s.values.provider);

  const providerOptions = [
    { value: "console", label: String(t("admin.settings.providerConsole")) },
    { value: "wapilot", label: String(t("admin.settings.providerWapilot")) },
    { value: "twilio", label: String(t("admin.settings.providerTwilio")) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{String(t("admin.settings.whatsappIntegration"))}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.AppField name="provider">
            {(field) => (
              <field.SelectField
                label={String(t("admin.settings.whatsappProviderLabel"))}
                description={String(t("admin.settings.whatsappProviderHint"))}
                options={providerOptions}
              />
            )}
          </form.AppField>

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
              <form.AppField name="wapilotInstanceId">
                {(field) => (
                  <field.StringField
                    label={String(t("admin.settings.wapilotInstanceId"))}
                    description={String(t("admin.settings.credentialUpdateHint"))}
                    className="text-start"
                  />
                )}
              </form.AppField>
              <form.AppField name="wapilotToken">
                {(field) => (
                  <field.PasswordField
                    label={String(t("admin.settings.wapilotToken"))}
                  />
                )}
              </form.AppField>
            </div>
          )}

          {/* Twilio credential inputs */}
          {provider === "twilio" && (
            <div className="space-y-4">
              <form.AppField name="twilioAccountSid">
                {(field) => (
                  <field.StringField
                    label={String(t("admin.settings.twilioAccountSid"))}
                    description={String(t("admin.settings.credentialUpdateHint"))}
                    className="text-start"
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                )}
              </form.AppField>
              <form.AppField name="twilioAuthToken">
                {(field) => (
                  <field.PasswordField
                    label={String(t("admin.settings.twilioAuthToken"))}
                  />
                )}
              </form.AppField>
              <form.AppField name="twilioFromNumber">
                {(field) => (
                  <field.StringField
                    label={String(t("admin.settings.twilioFromNumber"))}
                    className="text-start"
                    placeholder="+14155238886"
                  />
                )}
              </form.AppField>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={updateWhatsapp.isPending}>
              {String(t("common.save"))}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function AdminSettingsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const getOptions = trpc.admin.settings.get.queryOptions();
  const { data } = useQuery(getOptions);

  const storeLinksOptions = trpc.admin.settings.getStoreLinks.queryOptions();
  const { data: storeLinksData } = useQuery(storeLinksOptions);

  const waOptions = trpc.admin.settings.getWhatsapp.queryOptions();
  const { data: waData } = useQuery(waOptions);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <EntityPageHeader
        title={String(t("admin.settings.title"))}
        lead={String(t("admin.settings.lead"))}
      />

      {data && (
        <GeneralSettingsForm
          key={`${data.deliveryFeeEgp}-${data.supportWhatsappNumber}`}
          initial={{
            deliveryFeeEgp: data.deliveryFeeEgp,
            supportWhatsappNumber: data.supportWhatsappNumber,
          }}
          onSaved={() =>
            void queryClient.invalidateQueries({ queryKey: getOptions.queryKey })
          }
        />
      )}

      {storeLinksData && (
        <StoreLinksForm
          key={`${storeLinksData.playStoreUrl}-${storeLinksData.appStoreUrl}`}
          initial={{
            playStoreUrl: storeLinksData.playStoreUrl ?? "",
            appStoreUrl: storeLinksData.appStoreUrl ?? "",
          }}
          onSaved={() =>
            void queryClient.invalidateQueries({
              queryKey: storeLinksOptions.queryKey,
            })
          }
        />
      )}

      {waData && (
        <WhatsappForm
          key={waData.provider ?? "console"}
          initialProvider={waData.provider ?? "console"}
          wapilotConfigured={waData.credentials.wapilot.configured ?? false}
          twilioConfigured={waData.credentials.twilio.configured ?? false}
          onSaved={() =>
            void queryClient.invalidateQueries({ queryKey: waOptions.queryKey })
          }
        />
      )}
    </div>
  );
}
