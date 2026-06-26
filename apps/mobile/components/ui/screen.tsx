import { type ReactNode } from "react";
import { Pressable, Text, View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTranslation } from "@/lib/i18n";

type ScreenProps = ViewProps & {
  className?: string;
  /** Horizontal screen padding. Defaults to the standard 20px gutter. */
  padded?: boolean;
};

/**
 * Standard screen container for the dark-luxury theme.
 *
 * Replaces the old hardcoded `pt-16` with real safe-area insets so content
 * clears the notch/status bar on every device, and provides the shared canvas
 * (charcoal background + horizontal gutter).
 */
export function Screen({
  className,
  padded = true,
  style,
  children,
  ...props
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={`flex-1 bg-background ${padded ? "px-4" : ""} ${className ?? ""}`}
      style={[{ paddingTop: insets.top + 12, paddingBottom: insets.bottom }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

/** Large display title used at the top of a screen. */
export function ScreenHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <View className={`mb-4 flex-row items-start justify-between ${className ?? ""}`}>
      <View className="flex-1">
        <Text className="font-display text-3xl text-foreground">{title}</Text>
        {subtitle ? (
          <Text className="mt-1 text-sm text-muted-foreground">{subtitle}</Text>
        ) : null}
      </View>
      {right ? <View className="ms-3">{right}</View> : null}
    </View>
  );
}

/** Back button + title row for nested (pushed) screens. */
export function ScreenBackHeader({
  title,
  right,
  onBack,
  className,
}: {
  title: string;
  right?: ReactNode;
  onBack?: () => void;
  className?: string;
}) {
  const { locale } = useTranslation();
  return (
    <View className={`mb-4 flex-row items-center gap-3 ${className ?? ""}`}>
      <Pressable
        className="size-10 items-center justify-center rounded-full bg-elevated"
        onPress={onBack ?? (() => router.back())}
        hitSlop={8}
      >
        <Ionicons
          name={locale === "ar" ? "chevron-forward" : "chevron-back"}
          size={20}
          color="#F5F2EC"
        />
      </Pressable>
      <Text className="flex-1 font-display text-2xl text-foreground" numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}
