import type { ReactNode } from "react"
import { View } from "react-native"

import {
  extractValidationErrorMessage,
  flattenValidationErrors,
  translateFormErrorMessage,
} from "@workspace/forms/validation-messages"

import { Typography } from "@/components/ui/typography"
import { useTranslation } from "@/lib/i18n"
import { useFieldContext } from "./hooks"

export type MobileFieldProps = {
  label: string
  description?: string
}

/**
 * Whether the field should render its error state — touched and failing
 * validation. Single source of truth shared by `FieldBase` (label/message) and
 * each field control (red border).
 */
export function useFieldInvalid() {
  const field = useFieldContext()
  return field.state.meta.isTouched && !field.state.meta.isValid
}

/**
 * Mobile field wrapper — the RN counterpart of the web `FormBase`. Renders the
 * label, the control, an optional hint, and the first validation error once the
 * field is touched. Error messages are i18n keys resolved via the shared
 * `@workspace/forms` helpers (same source of truth as web).
 */
export function FieldBase({
  label,
  description,
  children,
}: MobileFieldProps & { children: ReactNode }) {
  const { t, locale } = useTranslation()
  const isInvalid = useFieldInvalid()
  const field = useFieldContext()

  const errors = flattenValidationErrors(field.state.meta.errors)
    .map((entry) => extractValidationErrorMessage(entry))
    .filter((message): message is string => Boolean(message))
    .map((message) =>
      translateFormErrorMessage((key) => String(t(key as never)), message, {
        locale,
        fallbackLocale: "en",
      }),
    )

  return (
    <View className="gap-1.5">
      <Typography
        className={`text-sm font-medium ${
          isInvalid ? "text-destructive" : "text-foreground"
        }`}
      >
        {label}
      </Typography>
      {children}
      {description ? (
        <Typography variant="caption">{description}</Typography>
      ) : null}
      {isInvalid && errors.length > 0 ? (
        <Typography variant="caption" className="text-destructive">
          {errors[0]}
        </Typography>
      ) : null}
    </View>
  )
}
