import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTranslation } from "@/lib/i18n";

type StatusChipProps = {
  status: string;
};

type ChipConfig = {
  bgClass: string;
  textClass: string;
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
};

const ACTIVE_STATUSES = ["placed", "assigned", "shopping", "purchased", "delivering"];

function getChipConfig(status: string): ChipConfig {
  if (ACTIVE_STATUSES.includes(status)) {
    return {
      bgClass: "bg-primary/10",
      textClass: "text-primary",
      iconName: "time-outline",
      iconColor: "#C9A227",
    };
  }
  if (status === "delivered") {
    return {
      bgClass: "bg-success/10",
      textClass: "text-success",
      iconName: "checkmark-circle-outline",
      iconColor: "#34D399",
    };
  }
  if (status === "cancelled") {
    return {
      bgClass: "bg-destructive/10",
      textClass: "text-destructive",
      iconName: "close-circle-outline",
      iconColor: "#F0584F",
    };
  }
  // fallback / unknown
  return {
    bgClass: "bg-elevated",
    textClass: "text-muted-foreground",
    iconName: "ellipse-outline",
    iconColor: "#9B968C",
  };
}

/**
 * Shared premium status chip for order and item statuses.
 * Displays a small Ionicons icon + translated label on a tinted pill.
 */
export function StatusChip({ status }: StatusChipProps) {
  const { t } = useTranslation();
  const { bgClass, textClass, iconName, iconColor } = getChipConfig(status);

  return (
    <View className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${bgClass}`}>
      <Ionicons name={iconName} size={13} color={iconColor} />
      <Text className={`text-xs font-semibold ${textClass}`}>
        {t(`shop.status.${status}` as never)}
      </Text>
    </View>
  );
}
