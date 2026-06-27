import { useMemo, useState } from "react"
import { Modal, Pressable, Text, View } from "react-native"
import {
  KeyboardAwareScrollView,
  KeyboardProvider,
} from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useStore } from "@tanstack/react-form"
import { Ionicons } from "@expo/vector-icons"

import { egyptianPhoneSchema } from "@workspace/validators/auth"

import { Button } from "@/components/ui/button"
import { KeyboardStickyFooter } from "@/components/ui/keyboard-screen"
import { FocusChainProvider, useAppForm } from "@/components/forms"
import { useTranslation } from "@/lib/i18n"
import { useTRPC } from "@/lib/trpc"
import { useSignedInCustomerPhone } from "@/lib/auth-gate"

// ─── Types ────────────────────────────────────────────────────────────────────

type GeoRow = {
  id: string
  nameEn: string | null
  nameAr: string | null
  sortOrder: number
  isActive: boolean
}

type FormState = {
  label: string
  cityId: string
  districtId: string
  areaId: string
  building: string
  floor: string
  apartment: string
  landmark: string
  contactPhone: string
  isDefault: boolean
}

/** Existing address shape accepted for editing. */
export type EditableAddress = {
  id: string
  label: string | null
  cityId: string | null
  districtId: string | null
  areaId: string | null
  building: string | null
  floor: string | null
  apartment: string | null
  landmark: string | null
  contactPhone: string
  isDefault: boolean
}

const emptyForm: FormState = {
  label: "",
  cityId: "",
  districtId: "",
  areaId: "",
  building: "",
  floor: "",
  apartment: "",
  landmark: "",
  contactPhone: "",
  isDefault: false,
}

function formFromAddress(address: EditableAddress): FormState {
  return {
    label: address.label ?? "",
    cityId: address.cityId ?? "",
    districtId: address.districtId ?? "",
    areaId: address.areaId ?? "",
    building: address.building ?? "",
    floor: address.floor ?? "",
    apartment: address.apartment ?? "",
    landmark: address.landmark ?? "",
    contactPhone: address.contactPhone,
    isDefault: address.isDefault,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function geoDisplayName(row: GeoRow, locale: string): string {
  return (
    (locale === "ar" ? row.nameAr : row.nameEn) ??
    row.nameAr ??
    row.nameEn ??
    "—"
  )
}

function geoOptions(rows: GeoRow[] | undefined, locale: string) {
  return (rows ?? []).map((row) => ({
    value: row.id,
    label: geoDisplayName(row, locale),
  }))
}

// ─── AddressFormModal ─────────────────────────────────────────────────────────

type AddressFormModalProps = {
  visible: boolean
  /** When set, the modal edits this address; otherwise it creates a new one. */
  address?: EditableAddress | null
  onClose: () => void
  /** Called after a successful create/update with the saved address id. */
  onSaved: (addressId: string) => void
}

/**
 * Bottom-sheet address editor reused by the addresses screen and inline at
 * checkout. Keeping it self-contained lets checkout add an address without
 * navigating away, so the customer continues straight to placing the order.
 */
export function AddressFormModal({
  visible,
  address,
  onClose,
  onSaved,
}: AddressFormModalProps) {
  const { t } = useTranslation()

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {/* RN Modal renders in its own window, so the root KeyboardProvider does
          not reach inside it — nest a provider here so the form stays keyboard
          aware within the sheet. */}
      <KeyboardProvider>
        <View className="flex-1 justify-end">
          <Pressable className="flex-1 bg-black/60" onPress={onClose} />
          <View className="max-h-[85%] rounded-t-2xl bg-card">
            {/* Drag handle */}
            <View className="items-center pt-3 pb-1">
              <View className="h-1 w-10 rounded-full bg-border" />
            </View>
            <View className="border-b border-border px-4 py-3">
              <Text className="text-center text-lg font-bold text-foreground">
                {address ? t("address.edit") : t("address.add")}
              </Text>
            </View>

            {/* Mount a fresh form per target, keyed by address id, so its fields
                prefill straight from `defaultValues`. This avoids resetting a
                shared form instance in an effect that races the modal's mount —
                the cause of edits opening with empty fields. */}
            {visible ? (
              <AddressForm
                key={address?.id ?? "new"}
                address={address ?? null}
                onClose={onClose}
                onSaved={onSaved}
              />
            ) : null}
          </View>
        </View>
      </KeyboardProvider>
    </Modal>
  )
}

// ─── AddressForm ──────────────────────────────────────────────────────────────

type AddressFormProps = {
  address: EditableAddress | null
  onClose: () => void
  onSaved: (addressId: string) => void
}

/** The form body — remounted per target so `defaultValues` does the prefill. */
function AddressForm({ address, onClose, onSaved }: AddressFormProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { t, locale } = useTranslation()
  const insets = useSafeAreaInsets()
  const customerPhone = useSignedInCustomerPhone()
  const [error, setError] = useState<string | null>(null)

  const listKey = trpc.addresses.list.queryOptions().queryKey
  const invalidate = () => queryClient.invalidateQueries({ queryKey: listKey })

  const onMutationError = (err: { message: string }) =>
    setError(
      err.message === "address.invalidGeoSelection"
        ? t("address.invalidGeoSelection")
        : t("validation.phoneInvalid")
    )

  const create = useMutation(
    trpc.addresses.create.mutationOptions({
      onSuccess: (row) => {
        void invalidate()
        if (row) onSaved(row.id)
      },
      onError: onMutationError,
    })
  )
  const update = useMutation(
    trpc.addresses.update.mutationOptions({
      onSuccess: (row) => {
        void invalidate()
        onSaved(row.id)
      },
      onError: onMutationError,
    })
  )

  const form = useAppForm({
    defaultValues: address ? formFromAddress(address) : { ...emptyForm, contactPhone: customerPhone },
    onSubmit: ({ value }) => {
      setError(null)
      const payload = {
        label: value.label.trim() || undefined,
        cityId: value.cityId,
        districtId: value.districtId,
        areaId: value.areaId,
        building: value.building.trim(),
        floor: value.floor.trim() || undefined,
        apartment: value.apartment.trim() || undefined,
        landmark: value.landmark.trim() || undefined,
        contactPhone: value.contactPhone.trim(),
        isDefault: value.isDefault,
      }
      if (address) update.mutate({ id: address.id, ...payload })
      else create.mutate(payload)
    },
  })

  const cityId = useStore(form.baseStore, (s) => s.values.cityId)
  const districtId = useStore(form.baseStore, (s) => s.values.districtId)

  // Geo queries — city always loaded, district/area enabled by selection.
  const { data: cities } = useQuery(trpc.geo.cities.queryOptions())
  const { data: districts } = useQuery(
    trpc.geo.districts.queryOptions({ cityId }, { enabled: !!cityId })
  )
  const { data: areas } = useQuery(
    trpc.geo.areas.queryOptions({ districtId }, { enabled: !!districtId })
  )

  const cityOptions = useMemo(() => geoOptions(cities, locale), [cities, locale])
  const districtOptions = useMemo(
    () => geoOptions(districts, locale),
    [districts, locale]
  )
  const areaOptions = useMemo(() => geoOptions(areas, locale), [areas, locale])

  return (
    <FocusChainProvider>
      <KeyboardAwareScrollView
        className="px-4"
        contentContainerClassName="gap-4 py-4"
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <form.AppField name="label">
          {(field) => <field.StringField label={t("address.label")} />}
        </form.AppField>

        {/* City picker */}
        <form.AppField
          name="cityId"
          listeners={{
            onChange: () => {
              form.setFieldValue("districtId", "")
              form.setFieldValue("areaId", "")
            },
          }}
          validators={{
            onSubmit: ({ value }) =>
              value ? undefined : "validation.required",
          }}
        >
          {(field) => (
            <field.SelectField
              label={t("address.city")}
              placeholder={t("address.selectCity")}
              options={cityOptions}
            />
          )}
        </form.AppField>

        {/* District picker — enabled only after city is chosen */}
        <form.AppField
          name="districtId"
          listeners={{
            onChange: () => form.setFieldValue("areaId", ""),
          }}
          validators={{
            onSubmit: ({ value }) =>
              value ? undefined : "validation.required",
          }}
        >
          {(field) => (
            <field.SelectField
              label={t("address.district")}
              placeholder={t("address.selectDistrict")}
              options={districtOptions}
              disabled={!cityId}
            />
          )}
        </form.AppField>

        {/* Area picker — enabled only after district is chosen */}
        <form.AppField
          name="areaId"
          validators={{
            onSubmit: ({ value }) =>
              value ? undefined : "validation.required",
          }}
        >
          {(field) => (
            <field.SelectField
              label={t("address.area")}
              placeholder={t("address.selectArea")}
              options={areaOptions}
              disabled={!districtId}
            />
          )}
        </form.AppField>

        {/* Building — required */}
        <form.AppField
          name="building"
          validators={{
            onSubmit: ({ value }) =>
              value.trim() ? undefined : "validation.required",
          }}
        >
          {(field) => (
            <field.StringField label={`${t("address.building")} *`} />
          )}
        </form.AppField>

        <form.AppField name="floor">
          {(field) => <field.StringField label={t("address.floor")} />}
        </form.AppField>
        <form.AppField name="apartment">
          {(field) => (
            <field.StringField label={t("address.apartment")} />
          )}
        </form.AppField>
        <form.AppField name="landmark">
          {(field) => <field.StringField label={t("address.landmark")} />}
        </form.AppField>

        {/* Contact phone — LTR override intentionally preserved */}
        <form.AppField
          name="contactPhone"
          validators={{
            onSubmit: ({ value }) =>
              egyptianPhoneSchema.safeParse(value).success
                ? undefined
                : "validation.phoneInvalid",
          }}
        >
          {(field) => (
            <field.PhoneField label={t("address.contactPhone")} />
          )}
        </form.AppField>

        {/* isDefault toggle */}
        <form.AppField name="isDefault">
          {(field) => (
            <field.BooleanField label={t("address.isDefault")} />
          )}
        </form.AppField>

        {error ? (
          <View className="flex-row items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3">
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color="#F0584F"
            />
            <Text className="flex-1 text-sm text-destructive">{error}</Text>
          </View>
        ) : null}
      </KeyboardAwareScrollView>

      {/* Fixed footer — lifts above the keyboard while editing fields. */}
      <KeyboardStickyFooter
        className="gap-2 border-t bg-background border-border px-4 py-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Button
          label={t("address.save")}
          loading={create.isPending || update.isPending}
          onPress={() => void form.handleSubmit()}
        />
        <Button
          variant="ghost"
          label={t("common.cancel")}
          onPress={onClose}
        />
      </KeyboardStickyFooter>
    </FocusChainProvider>
  )
}
