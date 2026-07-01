import { useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { LanguageToggle } from "@/components/language-toggle";
import { useAppAlert } from "@/components/ui/app-alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KeyboardAwareScreen } from "@/components/ui/keyboard-screen";
import { Screen, ScreenHeader } from "@/components/ui/screen";
import { useAppForm } from "@/components/forms";
import { useSignedIn } from "@/lib/auth-gate";
import { authenticate, isBiometricAvailable } from "@/lib/biometric";
import {
  biometricLogin,
  ensureDeviceRegistered,
  forgetTrustedDevice,
  getTrustedAccount,
  type TrustedAccount,
} from "@/lib/device-auth";
import { useTranslation } from "@/lib/i18n";
import { getExpoPushToken } from "@/lib/notifications";
import {
  getActiveAccount,
  removeAccount,
  removeActiveAccount,
  setAccountBiometric,
  updateAccountName,
} from "@/lib/session";
import { useTRPC } from "@/lib/trpc";

function NameEditForm({
  initialName,
  isPending,
  onSubmit,
  onCancel,
}: {
  initialName: string;
  isPending: boolean;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  const form = useAppForm({
    defaultValues: { name: initialName },
    onSubmit: ({ value }) => {
      const trimmed = value.name.trim();
      if (trimmed.length >= 2) onSubmit(trimmed);
    },
  });

  return (
    <View className="gap-3">
      <form.AppField
        name="name"
        validators={{
          onSubmit: ({ value }) =>
            value.trim().length >= 2 ? undefined : "validation.required",
        }}
      >
        {(field) => (
          <field.StringField
            label={t("shop.namePlaceholder")}
            placeholder={t("shop.namePlaceholder")}
            autoFocus
            maxLength={100}
          />
        )}
      </form.AppField>
      <View className="flex-row gap-3">
        <Button
          className="flex-1"
          label={t("shop.save")}
          loading={isPending}
          onPress={() => void form.handleSubmit()}
        />
        <Button
          className="flex-1"
          variant="outline"
          label={t("shop.cancel")}
          onPress={onCancel}
        />
      </View>
    </View>
  );
}

export default function AccountScreen() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();
  const appAlert = useAppAlert();
  const signedIn = useSignedIn();
  const { data } = useQuery({
    ...trpc.auth.me.queryOptions(),
    enabled: signedIn === true,
  });
  const { data: devices } = useQuery({
    ...trpc.auth.listDevices.queryOptions(),
    enabled: signedIn === true,
  });
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [trusted, setTrusted] = useState<TrustedAccount | null>(null);
  const [editingName, setEditingName] = useState(false);

  useEffect(() => {
    void (async () => {
      setBiometricAvailable(await isBiometricAvailable());
      const active = await getActiveAccount();
      setUserId(active?.userId ?? null);
      setBiometricOn(Boolean(active?.biometricEnabled));
      setTrusted(await getTrustedAccount());
    })();
  }, [signedIn]);

  // Reflect the server's channel once the profile loads / changes.
  useEffect(() => {
    if (data) setPushOn(data.notificationChannel === "push");
  }, [data]);

  const setChannel = useMutation(
    trpc.auth.setNotificationChannel.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.auth.me.queryKey(),
        });
      },
      onError: (err) => appAlert(t("common.error"), err.message),
    }),
  );

  const toggleChannel = async (next: boolean) => {
    if (next) {
      // Switching to in-app push: (re-)request OS permission. Only stick if
      // granted; otherwise leave the user on WhatsApp and point them to Settings.
      const token = await getExpoPushToken();
      if (!token) {
        appAlert(
          t("account.notifications.permissionDeniedTitle"),
          t("account.notifications.permissionDeniedBody"),
        );
        return;
      }
      setPushOn(true);
      setChannel.mutate({ channel: "push", pushToken: token });
    } else {
      setPushOn(false);
      setChannel.mutate({ channel: "whatsapp" });
    }
  };

  const toggleBiometric = async (next: boolean) => {
    if (!userId) return;
    if (next) {
      const ok = await authenticate(t("auth.biometric.unlockPrompt"));
      if (!ok) return;
    }
    await setAccountBiometric(userId, next);
    setBiometricOn(next);
    // Keep the trusted-device credential in sync: enabling registers it (so
    // biometric can re-login after a full sign-out), disabling revokes it.
    if (next && data) {
      try {
        await ensureDeviceRegistered({
          userId: data.user.id,
          role: data.user.role,
          name: data.user.name,
          phone: data.user.phone,
        });
      } catch {
        // best-effort
      }
    } else if (!next) {
      await forgetTrustedDevice();
    }
  };

  const updateProfile = useMutation(
    trpc.auth.updateProfile.mutationOptions({
      onSuccess: async (res) => {
        // Keep the locally cached account name (account picker, trusted device)
        // in sync with the server, then refresh the profile query.
        await updateAccountName(res.user.id, res.user.name ?? "");
        await queryClient.invalidateQueries({
          queryKey: trpc.auth.me.queryKey(),
        });
        setEditingName(false);
      },
      onError: (err) => appAlert(t("common.error"), err.message),
    }),
  );

  const startEditName = () => {
    setEditingName(true);
  };

  const continueAsTrusted = async () => {
    // Route straight to the role shell — going via "/" would make index prompt
    // for biometrics a second time (we just authenticated).
    const result = await biometricLogin(t("auth.biometric.unlockPrompt"));
    if (result) {
      router.replace(result.role === "driver" ? "/(driver)" : "/(customer)");
    }
  };

  const deleteAccount = useMutation(
    trpc.auth.deleteAccount.mutationOptions({
      onSuccess: async () => {
        await removeActiveAccount();
        queryClient.clear();
        appAlert("", t("auth.deleteAccountSuccess"));
        router.replace("/(customer)");
      },
      onError: (err) => appAlert(t("common.error"), err.message),
    }),
  );

  const confirmDeleteAccount = () => {
    appAlert(
      t("auth.deleteAccountConfirmTitle"),
      t("auth.deleteAccountConfirmMessage"),
      [
        { text: t("shop.cancel"), style: "cancel" },
        {
          text: t("auth.deleteAccountConfirm"),
          style: "destructive",
          onPress: () => deleteAccount.mutate(),
        },
      ],
    );
  };

  const revokeDevice = useMutation(
    trpc.auth.revokeDevice.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.auth.listDevices.queryKey(),
        });
      },
      onError: (err) => appAlert(t("common.error"), err.message),
    }),
  );

  const signOutEverywhere = useMutation(
    trpc.auth.signOutEverywhere.mutationOptions({
      onSettled: async () => {
        const id = data?.user.id ?? userId;
        if (id) await removeAccount(id);
        else await removeActiveAccount();
        await forgetTrustedDevice();
        queryClient.clear();
        router.replace("/(customer)");
      },
    }),
  );

  const confirmRevokeDevice = (deviceId: string) => {
    appAlert(
      t("account.devices.revoke"),
      t("account.devices.revokeConfirm"),
      [
        { text: t("shop.cancel"), style: "cancel" },
        {
          text: t("account.devices.revoke"),
          style: "destructive",
          onPress: () => revokeDevice.mutate({ deviceId }),
        },
      ],
    );
  };

  const confirmSignOutEverywhere = () => {
    appAlert(
      t("account.devices.signOutEverywhere"),
      t("account.devices.signOutEverywhereConfirm"),
      [
        { text: t("shop.cancel"), style: "cancel" },
        {
          text: t("account.devices.signOutEverywhere"),
          style: "destructive",
          onPress: () => signOutEverywhere.mutate(),
        },
      ],
    );
  };

  const signOut = useMutation(
    trpc.auth.signOut.mutationOptions({
      // Churn-aware: signing out keeps the user in the app (cart intact) on the
      // storefront rather than ejecting them to a login wall.
      onSettled: async () => {
        const id = data?.user.id ?? userId;
        if (id) await removeAccount(id);
        else await removeActiveAccount();
        queryClient.clear();
        router.replace("/(customer)");
      },
    }),
  );

  if (signedIn === false) {
    return (
      <Screen padded={false}>
        <ScreenHeader
          title={t("shop.tabAccount")}
          right={<LanguageToggle />}
          className="px-4"
        />
        <ScrollView
          className="flex-1 px-4"
          contentContainerClassName="gap-4"
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Card className="gap-2">
            <Text className="font-display text-lg text-foreground">
              {t("shop.guestAccountTitle")}
            </Text>
            <Text className="text-muted-foreground">
              {t("shop.guestAccountSubtitle")}
            </Text>
            <View className="gap-3 pt-1">
              {trusted ? (
                <Button
                  label={t("shop.continueAs", {
                    name: trusted.name || trusted.phone,
                  })}
                  onPress={() => void continueAsTrusted()}
                />
              ) : null}
              <Button
                variant={trusted ? "outline" : "default"}
                label={t("shop.signInCta")}
                onPress={() => router.push("/(auth)/sign-in")}
              />
            </View>
          </Card>

          <LegalLinks t={t} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <KeyboardAwareScreen
      padded
      contentContainerClassName="gap-4"
      contentContainerStyle={{ paddingBottom: 16 }}
      header={
        <ScreenHeader title={t("shop.tabAccount")} right={<LanguageToggle />} />
      }
    >
      <Card className="gap-2">
        {editingName ? (
          <NameEditForm
            initialName={data?.user.name ?? ""}
            isPending={updateProfile.isPending}
            onSubmit={(name) => updateProfile.mutate({ name })}
            onCancel={() => setEditingName(false)}
          />
        ) : (
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1 gap-1">
              <Text className="font-display text-lg text-foreground">
                {data?.user.name ?? "—"}
              </Text>
              {data?.user.phone ? (
                <Text className="text-muted-foreground">{data.user.phone}</Text>
              ) : null}
            </View>
            <Pressable
              onPress={startEditName}
              hitSlop={8}
              className="size-10 items-center justify-center rounded-full bg-elevated active:opacity-80"
              accessibilityLabel={t("shop.editName")}
            >
              <Ionicons name="pencil" size={18} color="#C9A227" />
            </Pressable>
          </View>
        )}
      </Card>

      <Pressable
        className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4 active:bg-elevated"
        onPress={() => router.push("/(customer)/addresses")}
      >
        <Ionicons name="location-outline" size={20} color="#C9A227" />
        <Text className="font-semibold text-foreground">
          {t("address.title")}
        </Text>
      </Pressable>

      {biometricAvailable ? (
        <Card className="flex-row items-center justify-between gap-3">
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <Ionicons name="finger-print-outline" size={18} color="#F5F2EC" />
              <Text className="font-semibold text-foreground">
                {t("auth.biometric.accountToggleLabel")}
              </Text>
            </View>
            <Text className="text-sm text-muted-foreground">
              {t("auth.biometric.accountToggleHint")}
            </Text>
          </View>
          <Switch
            value={biometricOn}
            onValueChange={(next) => void toggleBiometric(next)}
            trackColor={{ true: "#C9A227" }}
          />
        </Card>
      ) : null}

      <Card className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Ionicons name="notifications-outline" size={18} color="#F5F2EC" />
            <Text className="font-semibold text-foreground">
              {t("account.notifications.channelLabel")}
            </Text>
          </View>
          <Text className="text-sm text-muted-foreground">
            {t("account.notifications.channelHint")}
          </Text>
        </View>
        <Switch
          value={pushOn}
          onValueChange={(next) => void toggleChannel(next)}
          trackColor={{ true: "#C9A227" }}
        />
      </Card>

      {devices && devices.length > 0 ? (
        <Card className="gap-3">
          <View className="flex-row items-center gap-2">
            <Ionicons name="phone-portrait-outline" size={18} color="#F5F2EC" />
            <Text className="font-semibold text-foreground">
              {t("account.devices.title")}
            </Text>
          </View>
          <View className="gap-2">
            {devices.map((d) => (
              <View
                key={d.deviceId}
                className="flex-row items-center justify-between gap-3 rounded-xl border border-border bg-elevated p-3"
              >
                <View className="flex-1 gap-0.5">
                  <Text className="font-medium text-foreground">
                    {d.label ?? t("account.devices.defaultLabel")}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {d.lastUsedAt
                      ? t("account.devices.lastUsed", {
                        date: new Date(d.lastUsedAt).toLocaleDateString(locale),
                      })
                      : t("account.devices.added", {
                        date: new Date(d.createdAt).toLocaleDateString(locale),
                      })}
                  </Text>
                </View>
                <Pressable
                  onPress={() => confirmRevokeDevice(d.deviceId)}
                  hitSlop={8}
                  accessibilityLabel={t("account.devices.revoke")}
                >
                  <Text className="text-sm font-semibold text-destructive">
                    {t("account.devices.revoke")}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <Button
        variant="outline"
        label={t("auth.signOut")}
        loading={signOut.isPending}
        onPress={() => signOut.mutate()}
      />

      <Button
        variant="outline"
        label={t("account.devices.signOutEverywhere")}
        loading={signOutEverywhere.isPending}
        onPress={confirmSignOutEverywhere}
      />

      <LegalLinks t={t} />

      <Button
        variant="destructive"
        label={t("auth.deleteAccount")}
        loading={deleteAccount.isPending}
        onPress={confirmDeleteAccount}
      />
    </KeyboardAwareScreen>
  );
}

function LegalLinks({ t }: { t: ReturnType<typeof useTranslation>["t"] }) {
  return (
    <View className="flex-row justify-center gap-4">
      <Pressable onPress={() => router.push("/(customer)/privacy")} hitSlop={8}>
        <Text className="text-sm text-muted-foreground underline">
          {t("privacy.title")}
        </Text>
      </Pressable>
      <Pressable onPress={() => router.push("/(customer)/terms")} hitSlop={8}>
        <Text className="text-sm text-muted-foreground underline">
          {t("terms.title")}
        </Text>
      </Pressable>
    </View>
  );
}
