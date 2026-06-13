import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router } from "expo-router";

import { Button } from "@/components/ui/button";
import { authenticate } from "@/lib/biometric";
import { useTranslation } from "@/lib/i18n";
import { clearToken } from "@/lib/session";

/**
 * Full-screen gate shown on cold start when biometric unlock is enabled. Runs
 * the prompt immediately; on failure the user can retry or drop back to OTP
 * sign-in (which clears the stored session — the always-available escape hatch).
 */
export function BiometricLock({ onUnlocked }: { onUnlocked: () => void }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(true);

  const tryUnlock = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    const ok = await authenticate(t("auth.biometric.unlockPrompt"));
    setBusy(false);
    if (ok) onUnlocked();
    else setFailed(true);
  }, [onUnlocked, t]);

  useEffect(() => {
    void tryUnlock();
  }, [tryUnlock]);

  const useOtp = useCallback(async () => {
    await clearToken();
    router.replace("/(auth)/sign-in");
  }, []);

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-background p-6">
      <Text className="text-3xl font-black text-primary">
        {t("mobile.welcomeTitle")}
      </Text>
      <Text className="text-center text-muted-foreground">
        {t("auth.biometric.locked")}
      </Text>
      {busy ? <ActivityIndicator size="large" color="#7c3aed" /> : null}
      {failed ? (
        <View className="w-full gap-3">
          <Text className="text-center text-destructive">
            {t("auth.biometric.unlockFailed")}
          </Text>
          <Button label={t("auth.biometric.unlock")} onPress={() => void tryUnlock()} />
          <Button
            variant="ghost"
            label={t("auth.biometric.useOtpInstead")}
            onPress={() => void useOtp()}
          />
        </View>
      ) : null}
    </View>
  );
}
