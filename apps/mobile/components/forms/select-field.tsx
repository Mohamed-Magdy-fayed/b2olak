import { useState } from "react"
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"

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

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable className="flex-1 bg-black/60" onPress={() => setOpen(false)} />
        <View className="max-h-[60%] rounded-t-2xl bg-card px-4 pt-4 pb-8">
          <View className="mb-1 items-center">
            <View className="mb-3 h-1 w-10 rounded-full bg-border" />
          </View>
          <Text className="mb-3 text-center text-base font-bold text-foreground">
            {label}
          </Text>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
          </ScrollView>
        </View>
      </Modal>
    </FieldBase>
  )
}
