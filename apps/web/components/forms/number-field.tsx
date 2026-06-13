"use client";

import { Input } from "@workspace/ui/components/input";
import { FormBase, type FormFieldProps } from "./form-base";
import { useFieldContext } from "./hooks";

export function FormNumberField({
  placeholder,
  autoFocus,
  ...props
}: FormFieldProps & { placeholder?: string }) {
  const field = useFieldContext<number | null>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <FormBase {...props}>
      <Input
        aria-invalid={isInvalid}
        autoComplete="off"
        autoFocus={autoFocus}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(e) =>
          field.handleChange(
            isNaN(e.target.valueAsNumber) ? null : e.target.valueAsNumber,
          )
        }
        placeholder={placeholder}
        type="number"
        className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        value={field.state.value ?? ""}
      />
    </FormBase>
  );
}
