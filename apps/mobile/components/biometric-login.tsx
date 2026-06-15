import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/button";
import { biometricLogin } from "@/lib/device-auth";
import { useTranslation } from "@/lib/i18n";

/**
 * Shown on launch when there's no live session but the device is trusted.
 * Runs Face ID / fingerprint and exchanges the device credential for a fresh
 * session (no OTP). On cancel/failure the user can retry or continue as a guest.
 */
export function BiometricLogin({
  name,
  onLoggedIn,
  onGuest,
}: {
  name: string;
  onLoggedIn: (role: string) => void;
  onGuest: () => void;
}) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(true);

  const tryLogin = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    const result = await biometricLogin(t("auth.biometric.unlockPrompt"));
    setBusy(false);
    if (result) onLoggedIn(result.role);
    else setFailed(true);
  }, [onLoggedIn, t]);

  useEffect(() => {
    void tryLogin();
  }, [tryLogin]);

  return (
    <View className="flex-1 items-center justify-center gap-8 bg-background px-6">
      {/* Wordmark */}
      <Text className="font-display text-4xl text-primary">
        {t("mobile.welcomeTitle")}
      </Text>

      {/* Biometric icon + greeting */}
      <View className="items-center gap-4">
        <View className="size-24 items-center justify-center rounded-2xl bg-card">
          <Ionicons
            name={busy ? "scan-outline" : "finger-print-outline"}
            size={52}
            color="#C9A227"
          />
        </View>
        <Text className="text-center text-base text-muted-foreground">
          {t("shop.continueAs", { name })}
        </Text>
        {busy ? (
          <ActivityIndicator size="large" color="#C9A227" />
        ) : null}
      </View>

      {/* Failure actions */}
      {failed ? (
        <View className="w-full gap-3">
          <Button
            label={t("auth.biometric.unlock")}
            onPress={() => void tryLogin()}
          />
          <Button
            variant="ghost"
            label={t("shop.continueAsGuest")}
            onPress={onGuest}
          />
        </View>
      ) : null}
    </View>
  );
}
