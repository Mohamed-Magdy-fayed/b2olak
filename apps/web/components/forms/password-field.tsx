"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";

import { Input } from "@workspace/ui/components/input";
import { useTranslation } from "@workspace/i18n/react";
import { FormBase, type FormFieldProps } from "./form-base";
import { useFieldContext } from "./hooks";

export function FormPasswordField({
  placeholder,
  autoFocus,
  disabled,
  autoComplete,
  ...props
}: FormFieldProps & {
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
}) {
  const field = useFieldContext<string>();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <FormBase {...props} disabled={disabled}>
      <div className="relative">
        <Input
          aria-invalid={isInvalid}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          dir="ltr"
          disabled={disabled}
          id={field.name}
          name={field.name}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          placeholder={placeholder}
          type={visible ? "text" : "password"}
          value={field.state.value}
          className="pe-10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={t(
            (visible
              ? "common.hidePassword"
              : "common.showPassword") as never,
          )}
          className="text-muted-foreground hover:text-foreground absolute inset-y-0 end-0 flex items-center pe-3"
        >
          {visible ? (
            <EyeOffIcon className="size-4" />
          ) : (
            <EyeIcon className="size-4" />
          )}
        </button>
      </div>
    </FormBase>
  );
}
