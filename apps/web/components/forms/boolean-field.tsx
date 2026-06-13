"use client";

import { Checkbox } from "@workspace/ui/components/checkbox";
import { FormBase, type FormFieldProps } from "./form-base";
import { useFieldContext } from "./hooks";

export function FormBooleanField({ autoFocus, ...props }: FormFieldProps) {
  const field = useFieldContext<boolean>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <FormBase {...props} controlFirst>
      <Checkbox
        aria-invalid={isInvalid}
        autoFocus={autoFocus}
        checked={field.state.value}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onCheckedChange={(checked) => field.handleChange(checked === true)}
      />
    </FormBase>
  );
}
