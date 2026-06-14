import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTranslation } from "@/lib/i18n";

export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();
  const targetLabel = locale === "ar" ? "EN" : "ع";

  return (
    <Pressable
      className="flex-row items-center gap-1.5 rounded-full border border-border bg-elevated px-3 py-2 active:opacity-70"
      onPress={() => setLocale(locale === "ar" ? "en" : "ar")}
      accessibilityRole="button"
    >
      <Ionicons name="language-outline" size={15} color="#9B968C" />
      <Text className="text-sm font-semibold text-muted-foreground">{targetLabel}</Text>
    </Pressable>
  );
}
