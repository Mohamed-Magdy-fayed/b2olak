import { useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { LanguageToggle } from "@/components/language-toggle";
import { useAppAlert } from "@/components/ui/app-alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen, ScreenHeader } from "@/components/ui/screen";
import { authenticate, isBiometricAvailable } from "@/lib/biometric";
import {
  ensureDeviceRegistered,
  forgetTrustedDevice,
} from "@/lib/device-auth";
import { useTranslation } from "@/lib/i18n";
import {
  getActiveAccount,
  removeAccount,
  removeActiveAccount,
  setAccountBiometric,
} from "@/lib/session";
import { useTRPC } from "@/lib/trpc";

export default function DriverAccount() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const appAlert = useAppAlert();
  const { data } = useQuery(trpc.auth.me.queryOptions());
  const { data: balanceData } = useQuery(trpc.driver.balance.queryOptions());
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setBiometricAvailable(await isBiometricAvailable());
      const active = await getActiveAccount();
      setUserId(active?.userId ?? null);
      setBiometricOn(Boolean(active?.biometricEnabled));
    })();
  }, []);

  const toggleBiometric = async (next: boolean) => {
    if (!userId) return;
    if (next) {
      const ok = await authenticate(t("auth.biometric.unlockPrompt"));
      if (!ok) return;
    }
    await setAccountBiometric(userId, next);
    setBiometricOn(next);
    // Keep the trusted-device credential in sync so biometric can re-login the
    // captain after a full sign-out (no OTP).
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

  const signOut = useMutation(
    trpc.auth.signOut.mutationOptions({
      // Logging out of the captain app drops into the customer storefront as a
      // guest (not a login wall). Remove by user id so a stale active token can
      // never leave the driver account stored and bounce us back into /(driver).
      onError: (err: { message: string }) => {
        appAlert(t("common.error"), err.message);
      },
      onSettled: async () => {
        if (data?.user.id) await removeAccount(data.user.id);
        else await removeActiveAccount();
        queryClient.clear();
        router.replace("/(customer)");
      },
    }),
  );

  return (
    <Screen padded={false}>
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <ScreenHeader
          title={t("driver.tabAccount")}
          right={<LanguageToggle />}
        />

        {/* profile card */}
        <Card className="mb-4 flex-row items-center gap-4">
          <View className="size-12 items-center justify-center rounded-full bg-primary/10">
            <Ionicons name="person-outline" size={24} color="#C9A227" />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="font-display text-lg text-foreground">
              {data?.user.name ?? "—"}
            </Text>
            {data?.user.phone ? (
              <Text
                className="text-sm text-muted-foreground"
                style={{ writingDirection: "ltr" }}
              >
                {data.user.phone}
              </Text>
            ) : null}
          </View>
        </Card>

        {/* COD balance — negative means the driver owes the company */}
        {balanceData ? (
          <Card className="mb-4 gap-2">
            <View className="flex-row items-center gap-2">
              <Ionicons name="wallet-outline" size={18} color="#C9A227" />
              <Text className="font-semibold text-foreground">
                {t("driver.balance")}
              </Text>
            </View>
            <Text
              className={`font-display text-2xl ${
                Number(balanceData.balance) < 0
                  ? "text-destructive"
                  : "text-foreground"
              }`}
            >
              {Math.abs(Number(balanceData.balance)).toFixed(2)} EGP
            </Text>
            {Number(balanceData.balance) < 0 ? (
              <Text className="text-xs text-muted-foreground">
                {t("driver.balanceOwed")}
              </Text>
            ) : null}
          </Card>
        ) : null}

        {/* biometric toggle */}
        {biometricAvailable ? (
          <Card className="mb-4 flex-row items-center gap-3">
            <View className="size-10 items-center justify-center rounded-full bg-elevated">
              <Ionicons name="finger-print-outline" size={20} color="#C9A227" />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="font-semibold text-foreground">
                {t("auth.biometric.accountToggleLabel")}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {t("auth.biometric.accountToggleHint")}
              </Text>
            </View>
            <Switch
              value={biometricOn}
              onValueChange={(next) => void toggleBiometric(next)}
              trackColor={{ false: "#3A3A3C", true: "#C9A227" }}
              thumbColor="#F5F2EC"
            />
          </Card>
        ) : null}

        <Button
          variant="outline"
          label={t("auth.signOut")}
          loading={signOut.isPending}
          onPress={() => signOut.mutate()}
        />

        <View className="flex-row justify-center gap-4 pt-2">
          <Pressable
            onPress={() => router.push("/(customer)/privacy")}
            hitSlop={8}
          >
            <Text className="text-sm text-muted-foreground underline">
              {t("privacy.title")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(customer)/terms")}
            hitSlop={8}
          >
            <Text className="text-sm text-muted-foreground underline">
              {t("terms.title")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}
