import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

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
    <View className="flex-1 items-center justify-center gap-6 bg-background p-6">
      <Text className="text-3xl font-black text-primary">
        {t("mobile.welcomeTitle")}
      </Text>
      <Text className="text-center text-muted-foreground">
        {t("shop.continueAs", { name })}
      </Text>
      {busy ? <ActivityIndicator size="large" color="#7c3aed" /> : null}
      {failed ? (
        <View className="w-full gap-3">
          <Button label={t("auth.biometric.unlock")} onPress={() => void tryLogin()} />
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
