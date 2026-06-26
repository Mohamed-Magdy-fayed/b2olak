import { forwardRef, useState } from "react";
import { TextInput, type TextInputProps } from "react-native";

/** Dark-luxury input — elevated surface, gold focus ring, warm placeholder. */
export const Input = forwardRef<
  TextInput,
  TextInputProps & { className?: string; invalid?: boolean }
>(function Input({ className, invalid, onFocus, onBlur, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor="#9B968C"
      selectionColor="#C9A227"
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      className={`h-14 w-full rounded-2xl border bg-elevated px-4 text-base text-foreground ${
        invalid ? "border-destructive" : focused ? "border-primary" : "border-input"
      } ${className ?? ""}`}
      {...props}
    />
  );
});
