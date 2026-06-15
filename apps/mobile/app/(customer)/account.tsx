import { useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Screen, ScreenHeader } from "@/components/ui/screen";
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
import {
  getActiveAccount,
  removeAccount,
  removeActiveAccount,
  setAccountBiometric,
  updateAccountName,
} from "@/lib/session";
import { useTRPC } from "@/lib/trpc";

export default function AccountScreen() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const signedIn = useSignedIn();
  const { data } = useQuery({
    ...trpc.auth.me.queryOptions(),
    enabled: signedIn === true,
  });
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [trusted, setTrusted] = useState<TrustedAccount | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    void (async () => {
      setBiometricAvailable(await isBiometricAvailable());
      const active = await getActiveAccount();
      setUserId(active?.userId ?? null);
      setBiometricOn(Boolean(active?.biometricEnabled));
      setTrusted(await getTrustedAccount());
    })();
  }, [signedIn]);

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
    }),
  );

  const startEditName = () => {
    setNameDraft(data?.user.name ?? "");
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
      <Screen className="gap-4">
        <ScreenHeader title={t("shop.tabAccount")} right={<LanguageToggle />} />
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
      </Screen>
    );
  }

  return (
    <Screen className="gap-4">
      <ScreenHeader title={t("shop.tabAccount")} right={<LanguageToggle />} />

      <Card className="gap-2">
        {editingName ? (
          <View className="gap-3">
            <Input
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder={t("shop.namePlaceholder")}
              autoFocus
              maxLength={100}
            />
            <View className="flex-row gap-3">
              <Button
                className="flex-1"
                label={t("shop.save")}
                loading={updateProfile.isPending}
                disabled={nameDraft.trim().length < 2}
                onPress={() =>
                  updateProfile.mutate({ name: nameDraft.trim() })
                }
              />
              <Button
                className="flex-1"
                variant="outline"
                label={t("shop.cancel")}
                onPress={() => setEditingName(false)}
              />
            </View>
          </View>
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

      <Button
        variant="outline"
        label={t("auth.signOut")}
        loading={signOut.isPending}
        onPress={() => signOut.mutate()}
      />
    </Screen>
  );
}
