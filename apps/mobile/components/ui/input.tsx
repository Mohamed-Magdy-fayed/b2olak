import { TextInput, type TextInputProps } from "react-native";

export function Input({ className, ...props }: TextInputProps & { className?: string }) {
  return (
    <TextInput
      placeholderTextColor="#71717a"
      className={`h-12 w-full rounded-xl border border-input bg-card px-4 text-base text-foreground ${className ?? ""}`}
      {...props}
    />
  );
}
