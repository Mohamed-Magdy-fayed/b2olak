"use client";

import { Input } from "@workspace/ui/components/input";
import { FormBase, type FormFieldProps } from "./form-base";
import { useFieldContext } from "./hooks";

/**
 * Phone field for Egyptian mobile numbers.
 * Renders a plain `<input type="tel">` with LTR direction so digits are always
 * left-to-right regardless of the active locale.
 */
export function FormPhoneField({
  placeholder = "01001234567",
  autoFocus,
  disabled,
  ...props
}: FormFieldProps & {
  placeholder?: string;
  disabled?: boolean;
}) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <FormBase {...props} disabled={disabled}>
      <Input
        aria-invalid={isInvalid}
        autoComplete="tel"
        autoFocus={autoFocus}
        dir="ltr"
        disabled={disabled}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        placeholder={placeholder}
        type="tel"
        value={field.state.value}
      />
    </FormBase>
  );
}
