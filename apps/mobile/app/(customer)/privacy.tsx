import { ScrollView, Text, View } from "react-native";

import { Screen, ScreenBackHeader } from "@/components/ui/screen";
import { useTranslation } from "@/lib/i18n";
import { useTabBarHeight } from "@/lib/use-tab-bar-height";

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const tabBarHeight = useTabBarHeight();

  const sections = [
    { title: t("privacy.s1Title"), body: t("privacy.s1Body") },
    { title: t("privacy.s2Title"), body: t("privacy.s2Body") },
    { title: t("privacy.s3Title"), body: t("privacy.s3Body") },
    { title: t("privacy.s4Title"), body: t("privacy.s4Body") },
    { title: t("privacy.s5Title"), body: t("privacy.s5Body") },
  ];

  return (
    <Screen padded={false}>
      <ScreenBackHeader title={t("privacy.title")} className="px-5" />
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
      >
        <Text className="mb-5 text-sm text-muted-foreground">
          {t("privacy.lastUpdated")}
        </Text>
        {sections.map((s) => (
          <View key={s.title} className="mb-5 gap-2">
            <Text className="font-display text-lg text-foreground">
              {s.title}
            </Text>
            <Text className="text-base leading-relaxed text-muted-foreground">
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
