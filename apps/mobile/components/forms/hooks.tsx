import { createFormHook } from "@tanstack/react-form"

import { FormBooleanField } from "./boolean-field"
import { fieldContext, formContext, useFormContext } from "./form-context"
import { FormNumberField } from "./number-field"
import { FormPhoneField } from "./phone-field"
import { FormSelectField } from "./select-field"
import { FormStringField } from "./string-field"
import { FormTextareaField } from "./textarea-field"

const { useAppForm: useAppFormBase } = createFormHook({
  fieldComponents: {
    StringField: FormStringField,
    NumberField: FormNumberField,
    PhoneField: FormPhoneField,
    SelectField: FormSelectField,
    BooleanField: FormBooleanField,
    TextareaField: FormTextareaField,
  },
  formComponents: {},
  fieldContext,
  formContext,
})

/**
 * Mobile `useAppForm` — RN counterpart of the web hook. On an invalid submit it
 * marks errored fields touched so their inline messages render (mobile has no
 * toast layer, so errors stay attached to each field).
 */
const useAppForm: typeof useAppFormBase = (opts) =>
  useAppFormBase({
    ...opts,
    onSubmitInvalid: (props) => {
      const { formApi } = props
      for (const fieldName of Object.keys(formApi.state.fieldMeta)) {
        const meta = formApi.getFieldMeta(
          fieldName as keyof typeof formApi.state.fieldMeta,
        )
        if (meta?.errors && meta.errors.length > 0) {
          formApi.setFieldMeta(
            fieldName as keyof typeof formApi.state.fieldMeta,
            (prev) => ({ ...prev, isTouched: true }),
          )
        }
      }
      opts.onSubmitInvalid?.(props)
    },
  })

export { useAppForm, useFormContext }
