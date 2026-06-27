import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

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
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onSkip}>
      <Pressable className="flex-1 justify-end bg-black/60" onPress={onSkip}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            className="gap-5 rounded-t-3xl border-t border-border bg-background p-6"
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            {/* Gold biometric icon */}
            <View className="items-center py-2">
              <View className="size-20 items-center justify-center rounded-2xl bg-card">
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

            <View className="gap-3 pt-2">
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}
