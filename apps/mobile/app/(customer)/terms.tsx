import { ScrollView, Text, View } from "react-native";

import { Screen, ScreenBackHeader } from "@/components/ui/screen";
import { useTranslation } from "@/lib/i18n";
import { useTabBarHeight } from "@/lib/use-tab-bar-height";

export default function TermsScreen() {
  const { t } = useTranslation();
  const tabBarHeight = useTabBarHeight();

  const sections = [
    { title: t("terms.s1Title"), body: t("terms.s1Body") },
    { title: t("terms.s2Title"), body: t("terms.s2Body") },
    { title: t("terms.s3Title"), body: t("terms.s3Body") },
    { title: t("terms.s4Title"), body: t("terms.s4Body") },
  ];

  return (
    <Screen padded={false}>
      <ScreenBackHeader title={t("terms.title")} className="px-5" />
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
      >
        <Text className="mb-5 text-sm text-muted-foreground">
          {t("terms.lastUpdated")}
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
