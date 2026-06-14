import { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  const { data } = useQuery(trpc.auth.me.queryOptions());
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
      onSettled: async () => {
        if (data?.user.id) await removeAccount(data.user.id);
        else await removeActiveAccount();
        queryClient.clear();
        router.replace("/(customer)");
      },
    }),
  );

  return (
    <View className="flex-1 gap-4 bg-background px-4 pt-16">
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-black text-foreground">
          {t("driver.tabAccount")}
        </Text>
        <LanguageToggle />
      </View>

      <Card className="gap-1">
        <Text className="text-lg font-bold text-foreground">
          {data?.user.name ?? "—"}
        </Text>
        {data?.user.phone ? (
          <Text
            className="text-muted-foreground"
            style={{ writingDirection: "ltr" }}
          >
            {data.user.phone}
          </Text>
        ) : null}
      </Card>

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
