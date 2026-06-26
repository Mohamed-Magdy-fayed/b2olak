import { cva, type VariantProps } from "class-variance-authority";
import { ActivityIndicator, Pressable, Text } from "react-native";
import * as Haptics from "expo-haptics";

import { glowShadow } from "@/lib/shadows";

/** Dark-luxury button — gold primary, glow depth, subtle haptics. */

const buttonVariants = cva(
  "flex-row items-center justify-center rounded-2xl active:opacity-90",
  {
    variants: {
      variant: {
        default: "bg-primary",
        secondary: "bg-accent",
        outline: "border border-border bg-transparent",
        ghost: "bg-transparent",
        destructive: "bg-destructive",
      },
      size: {
        default: "min-h-14 py-3 px-6",
        sm: "min-h-10 py-2 px-4",
        lg: "min-h-16 py-3.5 px-7",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const buttonTextVariants = cva("font-medium tracking-wide", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-accent-foreground",
      outline: "text-foreground",
      ghost: "text-foreground",
      destructive: "text-white",
    },
    size: {
      default: "text-base",
      sm: "text-sm",
      lg: "text-lg",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

type ButtonProps = VariantProps<typeof buttonVariants> & {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
};

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = "default",
  size,
  className,
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={variant === "default" && !inactive ? glowShadow : undefined}
      className={`${buttonVariants({ variant, size })} ${inactive ? "opacity-50" : ""} ${className ?? ""}`}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "default" ? "#0E0E10" : "#F5F2EC"}
        />
      ) : (
        <Text className={buttonTextVariants({ variant, size })}>{label}</Text>
      )}
    </Pressable>
  );
}
