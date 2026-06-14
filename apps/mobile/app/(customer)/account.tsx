import { useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      <View className="flex-1 gap-4 bg-background px-4 pt-16">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-black text-foreground">
            {t("shop.tabAccount")}
          </Text>
          <LanguageToggle />
        </View>
        <Card className="gap-2">
          <Text className="text-lg font-black text-foreground">
            {t("shop.guestAccountTitle")}
          </Text>
          <Text className="text-muted-foreground">
            {t("shop.guestAccountSubtitle")}
          </Text>
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
        </Card>
      </View>
    );
  }

  return (
    <View className="flex-1 gap-4 bg-background px-4 pt-16">
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-black text-foreground">
          {t("shop.tabAccount")}
        </Text>
        <LanguageToggle />
      </View>

      <Card className="gap-1">
        <Text className="text-lg font-bold text-foreground">
          {data?.user.name ?? "—"}
        </Text>
        {data?.user.phone ? (
          <Text className="text-muted-foreground">{data.user.phone}</Text>
        ) : null}
      </Card>

      <Pressable
        className="rounded-xl border border-border bg-card p-4 active:bg-muted"
        onPress={() => router.push("/(customer)/addresses")}
      >
        <Text className="font-semibold text-foreground">
          📍 {t("address.title")}
        </Text>
      </Pressable>

      {biometricAvailable ? (
        <Card className="flex-row items-center justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="font-semibold text-foreground">
              🔒 {t("auth.biometric.accountToggleLabel")}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {t("auth.biometric.accountToggleHint")}
            </Text>
          </View>
          <Switch
            value={biometricOn}
            onValueChange={(next) => void toggleBiometric(next)}
            trackColor={{ true: "#7c3aed" }}
          />
        </Card>
      ) : null}

      <Button
        variant="outline"
        label={t("auth.signOut")}
        loading={signOut.isPending}
        onPress={() => signOut.mutate()}
      />
    </View>
  );
}
