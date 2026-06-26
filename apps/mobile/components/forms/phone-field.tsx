import { Input } from "@/components/ui/input"
import { FieldBase, useFieldInvalid, type MobileFieldProps } from "./field-base"
import { useFieldContext } from "./form-context"

/** Egyptian phone field — numeric keypad, always LTR so digits read correctly. */
export function FormPhoneField({
  label,
  description,
  placeholder = "01001234567",
  autoFocus,
}: MobileFieldProps & {
  placeholder?: string
  autoFocus?: boolean
}) {
  const field = useFieldContext<string>()
  const invalid = useFieldInvalid()

  return (
    <FieldBase label={label} description={description}>
      <Input
        value={field.state.value}
        invalid={invalid}
        onChangeText={(text) => field.handleChange(text)}
        onBlur={() => field.handleBlur()}
        placeholder={placeholder}
        autoFocus={autoFocus}
        keyboardType="phone-pad"
        autoCapitalize="none"
        style={{ writingDirection: "ltr", textAlign: "left" }}
      />
    </FieldBase>
  )
}
