"use client";

import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { toast } from "sonner";

import { useTranslation } from "@workspace/i18n/react";
import {
  extractValidationErrorMessage,
  flattenValidationErrors,
  translateFormErrorMessage,
} from "./validation-messages";
import { FormBooleanField } from "./boolean-field";
import { FormNumberField } from "./number-field";
import { FormPasswordField } from "./password-field";
import { FormPhoneField } from "./phone-field";
import { FormSelectField } from "./select-field";
import { FormStringField } from "./string-field";
import { FormTextareaField } from "./textarea-field";

const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

const { useAppForm: useAppFormBase } = createFormHook({
  fieldComponents: {
    StringField: FormStringField,
    NumberField: FormNumberField,
    PasswordField: FormPasswordField,
    PhoneField: FormPhoneField,
    SelectField: FormSelectField,
    BooleanField: FormBooleanField,
    TextareaField: FormTextareaField,
  },
  formComponents: {},
  fieldContext,
  formContext,
});

const useAppForm: typeof useAppFormBase = (opts) => {
  const { t, locale } = useTranslation();

  return useAppFormBase({
    ...opts,
    onSubmitInvalid: (props) => {
      const { formApi } = props;
      for (const fieldName of Object.keys(formApi.state.fieldMeta)) {
        const meta = formApi.getFieldMeta(
          fieldName as keyof typeof formApi.state.fieldMeta,
        );
        if (meta?.errors && meta.errors.length > 0) {
          formApi.setFieldMeta(
            fieldName as keyof typeof formApi.state.fieldMeta,
            (prev) => ({ ...prev, isTouched: true }),
          );
        }
      }
      opts.onSubmitInvalid?.(props);
      const errors = flattenValidationErrors(
        Object.values(formApi.state.fieldMeta).flatMap((meta) => {
          const fieldMeta = meta as { errors?: unknown[] } | undefined;
          return fieldMeta?.errors ?? [];
        }),
      );
      if (errors.length > 0) {
        const message = errors
          .map((e) => {
            const raw = extractValidationErrorMessage(e);
            return raw
              ? translateFormErrorMessage((key) => String(t(key as never)), raw, {
                  locale,
                  fallbackLocale: "en",
                })
              : undefined;
          })
          .filter(Boolean)
          .join("\n");
        if (message) toast.error(message);
      }
    },
  });
};

export { useAppForm, useFieldContext, useFormContext };
