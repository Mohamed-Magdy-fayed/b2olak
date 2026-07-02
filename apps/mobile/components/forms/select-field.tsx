import { useState } from "react"
import { Pressable, Text, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { AppBottomSheet, SheetScrollView } from "@/components/ui/bottom-sheet"

import { FieldBase, useFieldInvalid, type MobileFieldProps } from "./field-base"
import { useFieldContext } from "./form-context"

export type SelectOption = {
  value: string
  label: string
}

/**
 * Bottom-sheet single-select — the RN counterpart of the web `SelectField`.
 * Generalizes the address modal's GeoSelect so any form can use a picker.
 */
export function FormSelectField({
  label,
  description,
  placeholder,
  options,
  disabled,
}: MobileFieldProps & {
  placeholder?: string
  options: SelectOption[]
  disabled?: boolean
}) {
  const field = useFieldContext<string>()
  const invalid = useFieldInvalid()
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === field.state.value)

  return (
    <FieldBase label={label} description={description}>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        onBlur={() => field.handleBlur()}
        className={`bg-elevated h-12 w-full flex-row items-center rounded-2xl border px-4 ${invalid ? "border-destructive" : "border-input"
          } ${disabled ? "opacity-40" : ""}`}
      >
        <Text
          className={`flex-1 text-base ${selected ? "text-foreground" : "text-muted-foreground"
            }`}
        >
          {selected ? selected.label : (placeholder ?? "")}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#9B968C" />
      </Pressable>

      <AppBottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <SheetScrollView contentContainerClassName="pb-2">
          {options.map((option) => {
            const isSelected = option.value === field.state.value
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  field.handleChange(option.value)
                  setOpen(false)
                }}
                className={`flex-row items-center justify-between border-b border-border py-3.5 ${isSelected ? "bg-primary/10" : ""
                  }`}
              >
                <Text
                  className={`flex-1 text-base ${isSelected ? "font-bold text-primary" : "text-foreground"
                    }`}
                >
                  {option.label}
                </Text>
                {isSelected ? (
                  <Ionicons name="checkmark" size={18} color="#C9A227" />
                ) : null}
              </TouchableOpacity>
            )
          })}
        </SheetScrollView>
      </AppBottomSheet>
    </FieldBase>
  )
}
