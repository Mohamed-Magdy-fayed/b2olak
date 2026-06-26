import type { KeyboardTypeOptions, TextInputProps } from "react-native"

import { Input } from "@/components/ui/input"
import { FieldBase, useFieldInvalid, type MobileFieldProps } from "./field-base"
import { useFieldContext } from "./form-context"

export function FormStringField({
  label,
  description,
  placeholder,
  autoFocus,
  keyboardType,
  autoCapitalize,
  maxLength,
  className,
  ltr,
  sanitize,
}: MobileFieldProps & {
  placeholder?: string
  autoFocus?: boolean
  keyboardType?: KeyboardTypeOptions
  autoCapitalize?: TextInputProps["autoCapitalize"]
  maxLength?: number
  className?: string
  /** Force left-to-right text (emails, codes) regardless of locale. */
  ltr?: boolean
  /** Optional transform applied to typed text before storing (e.g. digits-only). */
  sanitize?: (text: string) => string
}) {
  const field = useFieldContext<string>()
  const invalid = useFieldInvalid()

  return (
    <FieldBase label={label} description={description}>
      <Input
        value={field.state.value}
        invalid={invalid}
        onChangeText={(text) =>
          field.handleChange(sanitize ? sanitize(text) : text)
        }
        onBlur={() => field.handleBlur()}
        placeholder={placeholder}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        className={className}
        style={ltr ? { writingDirection: "ltr", textAlign: "center", direction: "ltr" } : undefined}
      />
    </FieldBase>
  )
}
