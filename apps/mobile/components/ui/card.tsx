import { View, type ViewProps } from "react-native";

import { cardShadow } from "@/lib/shadows";

/** Elevated surface for the dark-luxury theme — soft depth, hairline border. */
export function Card({
  className,
  style,
  ...props
}: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-2xl border border-border bg-card p-5 ${className ?? ""}`}
      style={[cardShadow, style]}
      {...props}
    />
  );
}
