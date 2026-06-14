import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { useTRPC } from "@/lib/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────

type GeoRow = {
  id: string;
  nameEn: string | null;
  nameAr: string | null;
  sortOrder: number;
  isActive: boolean;
};

type FormState = {
  label: string;
  cityId: string;
  districtId: string;
  areaId: string;
  building: string;
  floor: string;
  apartment: string;
  landmark: string;
  contactPhone: string;
  isDefault: boolean;
};

/** Existing address shape accepted for editing. */
export type EditableAddress = {
  id: string;
  label: string | null;
  cityId: string | null;
  districtId: string | null;
  areaId: string | null;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  contactPhone: string;
  isDefault: boolean;
};

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
};

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
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function geoDisplayName(row: GeoRow, locale: string): string {
  return (
    (locale === "ar" ? row.nameAr : row.nameEn) ??
    row.nameAr ??
    row.nameEn ??
    "—"
  );
}

// ─── GeoPickerModal ───────────────────────────────────────────────────────────

type GeoPickerModalProps = {
  visible: boolean;
  title: string;
  items: GeoRow[];
  selectedId: string;
  locale: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

function GeoPickerModal({
  visible,
  title,
  items,
  selectedId,
  locale,
  onSelect,
  onClose,
}: GeoPickerModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View className="max-h-[60%] rounded-t-2xl bg-background px-4 pb-6 pt-4">
        <Text className="mb-3 text-center text-base font-bold text-foreground">
          {title}
        </Text>
        <ScrollView keyboardShouldPersistTaps="handled">
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                onSelect(item.id);
                onClose();
              }}
              className={`border-b border-border py-3 ${
                selectedId === item.id ? "bg-primary/10" : ""
              }`}
            >
              <Text
                className={`text-base ${
                  selectedId === item.id
                    ? "font-bold text-primary"
                    : "text-foreground"
                }`}
              >
                {geoDisplayName(item, locale)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── GeoSelect ────────────────────────────────────────────────────────────────

type GeoSelectProps = {
  label: string;
  placeholder: string;
  items: GeoRow[] | undefined;
  selectedId: string;
  locale: string;
  disabled?: boolean;
  onSelect: (id: string) => void;
};

function GeoSelect({
  label,
  placeholder,
  items,
  selectedId,
  locale,
  disabled,
  onSelect,
}: GeoSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = items?.find((r) => r.id === selectedId);

  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        className={`h-12 w-full flex-row items-center rounded-xl border border-input bg-card px-4 ${
          disabled ? "opacity-40" : ""
        }`}
      >
        <Text
          className={`flex-1 text-base ${
            selected ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {selected ? geoDisplayName(selected, locale) : placeholder}
        </Text>
        <Text className="text-muted-foreground">▾</Text>
      </Pressable>
      {items ? (
        <GeoPickerModal
          visible={open}
          title={label}
          items={items}
          selectedId={selectedId}
          locale={locale}
          onSelect={onSelect}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </View>
  );
}

// ─── AddressFormModal ─────────────────────────────────────────────────────────

type AddressFormModalProps = {
  visible: boolean;
  /** When set, the modal edits this address; otherwise it creates a new one. */
  address?: EditableAddress | null;
  onClose: () => void;
  /** Called after a successful create/update with the saved address id. */
  onSaved: (addressId: string) => void;
};

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
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  // Reset the form whenever the sheet is (re)opened for a new target.
  useEffect(() => {
    if (visible) {
      setForm(address ? formFromAddress(address) : emptyForm);
      setError(null);
    }
  }, [visible, address]);

  // Geo queries — city always loaded, district/area enabled by selection.
  const { data: cities } = useQuery(trpc.geo.cities.queryOptions());
  const { data: districts } = useQuery(
    trpc.geo.districts.queryOptions(
      { cityId: form.cityId },
      { enabled: !!form.cityId },
    ),
  );
  const { data: areas } = useQuery(
    trpc.geo.areas.queryOptions(
      { districtId: form.districtId },
      { enabled: !!form.districtId },
    ),
  );

  const listKey = trpc.addresses.list.queryOptions().queryKey;
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: listKey });

  const onMutationError = (err: { message: string }) =>
    setError(
      err.message === "address.invalidGeoSelection"
        ? t("address.invalidGeoSelection")
        : t("validation.phoneInvalid"),
    );

  const create = useMutation(
    trpc.addresses.create.mutationOptions({
      onSuccess: (row) => {
        void invalidate();
        if (row) onSaved(row.id);
      },
      onError: onMutationError,
    }),
  );
  const update = useMutation(
    trpc.addresses.update.mutationOptions({
      onSuccess: (row) => {
        void invalidate();
        onSaved(row.id);
      },
      onError: onMutationError,
    }),
  );

  function submit() {
    setError(null);

    if (!form.cityId || !form.districtId || !form.areaId) {
      setError(t("address.invalidGeoSelection"));
      return;
    }
    if (!form.building.trim()) {
      setError(t("address.building"));
      return;
    }

    const payload = {
      label: form.label.trim() || undefined,
      cityId: form.cityId,
      districtId: form.districtId,
      areaId: form.areaId,
      building: form.building.trim(),
      floor: form.floor.trim() || undefined,
      apartment: form.apartment.trim() || undefined,
      landmark: form.landmark.trim() || undefined,
      contactPhone: form.contactPhone.trim(),
      isDefault: form.isDefault,
    };

    if (address) {
      update.mutate({ id: address.id, ...payload });
    } else {
      create.mutate(payload);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View className="max-h-[85%] rounded-t-2xl bg-background">
        <View className="border-b border-border px-4 py-3">
          <Text className="text-center text-lg font-bold text-foreground">
            {address ? t("address.edit") : t("address.add")}
          </Text>
        </View>

        <ScrollView
          className="px-4"
          contentContainerClassName="gap-3 py-4"
          keyboardShouldPersistTaps="handled"
        >
          {/* Label (optional) */}
          <View className="gap-1">
            <Text className="text-sm font-medium text-foreground">
              {t("address.label")}
            </Text>
            <Input
              value={form.label}
              onChangeText={(value) => setForm({ ...form, label: value })}
            />
          </View>

          {/* City picker */}
          <GeoSelect
            label={t("address.city")}
            placeholder={t("address.selectCity")}
            items={cities}
            selectedId={form.cityId}
            locale={locale}
            onSelect={(cityId) =>
              setForm({ ...form, cityId, districtId: "", areaId: "" })
            }
          />

          {/* District picker — enabled only after city is chosen */}
          <GeoSelect
            label={t("address.district")}
            placeholder={t("address.selectDistrict")}
            items={districts}
            selectedId={form.districtId}
            locale={locale}
            disabled={!form.cityId}
            onSelect={(districtId) =>
              setForm({ ...form, districtId, areaId: "" })
            }
          />

          {/* Area picker — enabled only after district is chosen */}
          <GeoSelect
            label={t("address.area")}
            placeholder={t("address.selectArea")}
            items={areas}
            selectedId={form.areaId}
            locale={locale}
            disabled={!form.districtId}
            onSelect={(areaId) => setForm({ ...form, areaId })}
          />

          {/* Building — required */}
          <View className="gap-1">
            <Text className="text-sm font-medium text-foreground">
              {t("address.building")}
              <Text className="text-destructive"> *</Text>
            </Text>
            <Input
              value={form.building}
              onChangeText={(value) => setForm({ ...form, building: value })}
            />
          </View>

          {/* Optional text fields */}
          {(
            [
              ["floor", t("address.floor")],
              ["apartment", t("address.apartment")],
              ["landmark", t("address.landmark")],
            ] as const
          ).map(([key, label]) => (
            <View key={key} className="gap-1">
              <Text className="text-sm font-medium text-foreground">{label}</Text>
              <Input
                value={form[key]}
                onChangeText={(value) => setForm({ ...form, [key]: value })}
              />
            </View>
          ))}

          {/* Contact phone */}
          <View className="gap-1">
            <Text className="text-sm font-medium text-foreground">
              {t("address.contactPhone")}
            </Text>
            <Input
              value={form.contactPhone}
              onChangeText={(value) => setForm({ ...form, contactPhone: value })}
              keyboardType="phone-pad"
              style={{ textAlign: "left", writingDirection: "ltr", direction: "ltr" }}
            />
          </View>

          {/* isDefault toggle */}
          <Pressable
            className="flex-row items-center gap-2"
            onPress={() => setForm({ ...form, isDefault: !form.isDefault })}
          >
            <Text className="text-lg">{form.isDefault ? "☑" : "☐"}</Text>
            <Text className="text-foreground">{t("address.isDefault")}</Text>
          </Pressable>

          {error ? <Text className="text-destructive">{error}</Text> : null}
        </ScrollView>

        {/* Fixed footer */}
        <View className="gap-2 border-t border-border px-4 pb-6 pt-3">
          <Button
            label={t("address.save")}
            loading={create.isPending || update.isPending}
            onPress={submit}
          />
          <Button variant="ghost" label={t("common.cancel")} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
