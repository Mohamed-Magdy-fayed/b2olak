import { Modal, Text, View } from "react-native";

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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onSkip}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="gap-4 rounded-t-3xl bg-background p-6 pb-10">
          <Text className="text-xl font-black text-foreground">
            {t("auth.biometric.enableTitle")}
          </Text>
          <Text className="text-muted-foreground">
            {t("auth.biometric.enableBody")}
          </Text>
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
        </View>
      </View>
    </Modal>
  );
}
