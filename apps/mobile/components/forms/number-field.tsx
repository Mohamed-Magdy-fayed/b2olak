import { Input } from "@/components/ui/input"
import { FieldBase, useFieldInvalid, type MobileFieldProps } from "./field-base"
import { useFieldContext } from "./hooks"

export function FormNumberField({
  label,
  description,
  placeholder,
}: MobileFieldProps & { placeholder?: string }) {
  const field = useFieldContext<number | null>()
  const invalid = useFieldInvalid()

  return (
    <FieldBase label={label} description={description}>
      <Input
        value={field.state.value == null ? "" : String(field.state.value)}
        invalid={invalid}
        onChangeText={(text) => {
          const parsed = Number(text)
          field.handleChange(text.trim() === "" || isNaN(parsed) ? null : parsed)
        }}
        onBlur={() => field.handleBlur()}
        placeholder={placeholder}
        keyboardType="number-pad"
        style={{ writingDirection: "ltr", textAlign: "left" }}
      />
    </FieldBase>
  )
}
