"use client";

import type { ComponentProps } from "react";

import { Input } from "@workspace/ui/components/input";
import { FormBase, type FormFieldProps } from "./form-base";
import { useFieldContext } from "./hooks";

export function FormStringField({
  placeholder,
  autoFocus,
  inputType,
  disabled,
  className,
  dir,
  inputMode,
  maxLength,
  autoComplete = "off",
  ...props
}: FormFieldProps & {
  placeholder?: string;
  inputType?: ComponentProps<typeof Input>["type"];
  disabled?: boolean;
  className?: string;
  dir?: "ltr" | "rtl";
  inputMode?: ComponentProps<typeof Input>["inputMode"];
  maxLength?: number;
  autoComplete?: string;
}) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <FormBase {...props} disabled={disabled}>
      <Input
        aria-invalid={isInvalid}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        className={className}
        dir={dir}
        disabled={disabled}
        id={field.name}
        inputMode={inputMode}
        maxLength={maxLength}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        placeholder={placeholder}
        type={inputType}
        value={field.state.value}
      />
    </FormBase>
  );
}
