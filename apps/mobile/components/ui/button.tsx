import { cva, type VariantProps } from "class-variance-authority";
import { ActivityIndicator, Pressable, Text } from "react-native";

/** shadcn-parity button (react-native-reusables conventions, cva variants). */

const buttonVariants = cva(
  "flex-row items-center justify-center rounded-xl active:opacity-80",
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
        default: "h-12 px-5",
        sm: "h-9 px-3",
        lg: "h-14 px-6",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const buttonTextVariants = cva("font-semibold", {
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
  variant,
  size,
  className,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      className={`${buttonVariants({ variant, size })} ${disabled || loading ? "opacity-50" : ""} ${className ?? ""}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <Text className={buttonTextVariants({ variant, size })}>{label}</Text>
      )}
    </Pressable>
  );
}
