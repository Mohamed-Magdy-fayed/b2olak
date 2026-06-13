"use client";

import { Textarea } from "@workspace/ui/components/textarea";
import { FormBase, type FormFieldProps } from "./form-base";
import { useFieldContext } from "./hooks";

export function FormTextareaField({
  placeholder,
  rows = 4,
  ...props
}: FormFieldProps & { placeholder?: string; rows?: number }) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <FormBase {...props}>
      <Textarea
        aria-invalid={isInvalid}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={field.state.value}
      />
    </FormBase>
  );
}
