"use client";

import { useCallback, useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { FormBase, type FormFieldProps } from "./form-base";
import { useFieldContext } from "./hooks";

type SelectOption = {
  value: string;
  label: string;
};

type FormSelectFieldProps = FormFieldProps & {
  options: SelectOption[];
  placeholder?: string;
};

export function FormSelectField({
  options,
  placeholder,
  ...props
}: FormSelectFieldProps) {
  const field = useFieldContext();
  const stateValue = field.state.value;
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const setSingleValue = useCallback(
    (val: string | null) => field.handleChange(val ?? ""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [field.handleChange],
  );

  const currentValue = useMemo(
    () => (stateValue as string) || null,
    [stateValue],
  );

  return (
    <FormBase {...props}>
      <Select
        value={currentValue}
        onValueChange={(val) => setSingleValue((val as string) ?? null)}
      >
        <SelectTrigger
          id={field.name}
          aria-invalid={isInvalid}
          className="w-full"
        >
          <SelectValue placeholder={placeholder}>
            {(val) =>
              options.find((o) => o.value === (val as string))?.label ??
              placeholder ??
              ""
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormBase>
  );
}
