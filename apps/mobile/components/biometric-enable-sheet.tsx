import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppBottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

/**
 * One-time offer shown right after the first OTP sign-in, asking whether to
 * gate future app opens behind Face ID / fingerprint. Either choice records
 * that the prompt was seen (caller's responsibility) so it never nags again.
 */
export function BiometricEnableSheet({
  visible,
  busy,
  onEnable,
  onSkip,
}: {
  visible: boolean;
  busy: boolean;
  onEnable: () => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onSkip}
      footer={
        <>
          <Button
            label={t("auth.biometric.enable")}
            loading={busy}
            onPress={onEnable}
          />
          <Button
            variant="ghost"
            label={t("auth.biometric.notNow")}
            disabled={busy}
            onPress={onSkip}
          />
        </>
      }
    >
      <View className="gap-5 px-4 pb-2">
        {/* Gold biometric icon */}
        <View className="items-center py-2">
          <View className="size-20 items-center justify-center rounded-2xl bg-elevated">
            <Ionicons name="finger-print-outline" size={44} color="#C9A227" />
          </View>
        </View>

        <View className="gap-2">
          <Text className="font-display text-2xl text-foreground">
            {t("auth.biometric.enableTitle")}
          </Text>
          <Text className="text-base text-muted-foreground">
            {t("auth.biometric.enableBody")}
          </Text>
        </View>
      </View>
    </AppBottomSheet>
  );
}
