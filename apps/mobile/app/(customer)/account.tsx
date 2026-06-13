import { useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";

import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authenticate, isBiometricAvailable } from "@/lib/biometric";
import { useTranslation } from "@/lib/i18n";
import {
  clearToken,
  isBiometricEnabled,
  setBiometricEnabled,
} from "@/lib/session";
import { useTRPC } from "@/lib/trpc";

export default function AccountScreen() {
  const trpc = useTRPC();
  const { t } = useTranslation();
  const { data } = useQuery(trpc.auth.me.queryOptions());
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);

  useEffect(() => {
    void (async () => {
      setBiometricAvailable(await isBiometricAvailable());
      setBiometricOn(await isBiometricEnabled());
    })();
  }, []);

  const toggleBiometric = async (next: boolean) => {
    if (next) {
      const ok = await authenticate(t("auth.biometric.unlockPrompt"));
      if (!ok) return;
    }
    await setBiometricEnabled(next);
    setBiometricOn(next);
  };

  const signOut = useMutation(
    trpc.auth.signOut.mutationOptions({
      onSettled: async () => {
        await clearToken();
        router.replace("/(auth)/sign-in");
      },
    }),
  );

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
