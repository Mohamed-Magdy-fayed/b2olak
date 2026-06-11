import { View, type ViewProps } from "react-native";

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-xl border border-border bg-card p-4 ${className ?? ""}`}
      {...props}
    />
  );
}
