import { Input } from "@/components/ui/input"
import { FieldBase, useFieldInvalid, type MobileFieldProps } from "./field-base"
import { useFieldContext } from "./hooks"

export function FormTextareaField({
  label,
  description,
  placeholder,
  numberOfLines = 3,
}: MobileFieldProps & { placeholder?: string; numberOfLines?: number }) {
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
        multiline
        numberOfLines={numberOfLines}
        className="h-auto min-h-24 py-3"
        style={{ textAlignVertical: "top" }}
      />
    </FieldBase>
  )
}
