import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSignedIn } from "@/lib/auth-gate";
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
  id?: string;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function geoDisplayName(row: GeoRow, locale: string): string {
  return (
    (locale === "ar" ? row.nameAr : row.nameEn) ??
    row.nameAr ??
    row.nameEn ??
    "—"
  );
}

/** Prefer locale-aware ref names; fall back to legacy snapshot strings. */
function addressSummary(
  address: {
    city: string;
    area: string;
    street: string;
    cityRef: { nameEn: string | null; nameAr: string | null } | null;
    districtRef: { nameEn: string | null; nameAr: string | null } | null;
    areaRef: { nameEn: string | null; nameAr: string | null } | null;
  },
  locale: string,
): string {
  const pick = (
    ref: { nameEn: string | null; nameAr: string | null } | null,
    fallback: string,
  ) =>
    (ref
      ? (locale === "ar" ? ref.nameAr : ref.nameEn) ?? ref.nameAr ?? ref.nameEn
      : null) ?? fallback;

  const city = pick(address.cityRef, address.city);
  const district = pick(address.districtRef, address.area);
  const area = pick(address.areaRef, address.street);
  return [city, district, area].filter(Boolean).join("، ");
}

function addressLabel(
  address: {
    label: string | null;
    area: string;
    areaRef: { nameEn: string | null; nameAr: string | null } | null;
  },
  locale: string,
): string {
  if (address.label) return address.label;
  const ref = address.areaRef;
  if (ref) {
    return (
      (locale === "ar" ? ref.nameAr : ref.nameEn) ??
      ref.nameAr ??
      ref.nameEn ??
      address.area
    );
  }
  return address.area;
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/40"
        onPress={onClose}
      />
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddressesScreen() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();
  const signedIn = useSignedIn();
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Address management is sign-in only; a guest who lands here is sent back.
  useEffect(() => {
    if (signedIn === false) router.replace("/(customer)");
  }, [signedIn]);

  // List addresses
  const listOptions = trpc.addresses.list.queryOptions();
  const { data: addresses } = useQuery({
    ...listOptions,
    enabled: signedIn === true,
  });

  // Geo queries — city always loaded, district/area enabled by selection
  const citiesOptions = trpc.geo.cities.queryOptions();
  const { data: cities } = useQuery(citiesOptions);

  const districtsOptions = trpc.geo.districts.queryOptions(
    { cityId: form?.cityId ?? "" },
    { enabled: !!form?.cityId },
  );
  const { data: districts } = useQuery(districtsOptions);

  const areasOptions = trpc.geo.areas.queryOptions(
    { districtId: form?.districtId ?? "" },
    { enabled: !!form?.districtId },
  );
  const { data: areas } = useQuery(areasOptions);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: listOptions.queryKey });

  const create = useMutation(
    trpc.addresses.create.mutationOptions({
      onSuccess: () => {
        void invalidate();
        setForm(null);
      },
      onError: (err) =>
        setError(
          err.message === "address.invalidGeoSelection"
            ? t("address.invalidGeoSelection")
            : t("validation.phoneInvalid"),
        ),
    }),
  );
  const update = useMutation(
    trpc.addresses.update.mutationOptions({
      onSuccess: () => {
        void invalidate();
        setForm(null);
      },
      onError: (err) =>
        setError(
          err.message === "address.invalidGeoSelection"
            ? t("address.invalidGeoSelection")
            : t("validation.phoneInvalid"),
        ),
    }),
  );
  const remove = useMutation(
    trpc.addresses.delete.mutationOptions({
      onSuccess: () => void invalidate(),
    }),
  );

  function submit() {
    if (!form) return;
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

    if (form.id) {
      update.mutate({ id: form.id, ...payload });
    } else {
      create.mutate(payload);
    }
  }

  function openEdit(address: {
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
  }) {
    setForm({
      id: address.id,
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
    });
  }

  return (
    <ScrollView
      className="flex-1 bg-background px-4 pt-16"
      contentContainerClassName="gap-3 pb-10"
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row items-center gap-3">
        <Pressable
          className="size-10 items-center justify-center rounded-full bg-muted"
          onPress={() => router.back()}
        >
          <Text className="text-lg">{locale === "ar" ? "→" : "←"}</Text>
        </Pressable>
        <Text className="text-2xl font-black text-foreground">
          {t("address.title")}
        </Text>
      </View>

      {form === null ? (
        <>
          {(addresses ?? []).map((address) => (
            <Card key={address.id} className="gap-1">
              <View className="flex-row items-center justify-between">
                <Text className="font-bold text-foreground">
                  {addressLabel(address, locale)}
                  {address.isDefault ? " ⭐" : ""}
                </Text>
                <View className="flex-row gap-3">
                  <Pressable onPress={() => openEdit(address)}>
                    <Text className="font-semibold text-primary">
                      {t("admin.common.edit")}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => remove.mutate({ id: address.id })}>
                    <Text className="font-semibold text-destructive">
                      {t("address.delete")}
                    </Text>
                  </Pressable>
                </View>
              </View>
              <Text className="text-sm text-muted-foreground">
                {addressSummary(address, locale)}
                {address.building ? `، ${address.building}` : ""}
              </Text>
            </Card>
          ))}
          {addresses?.length === 0 ? (
            <Text className="py-6 text-center text-muted-foreground">
              {t("address.none")}
            </Text>
          ) : null}
          <Button label={t("address.add")} onPress={() => setForm(emptyForm)} />
        </>
      ) : (
        <Card className="gap-3">
          <Text className="text-lg font-bold text-foreground">
            {form.id ? t("address.edit") : t("address.add")}
          </Text>

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
              onChangeText={(value) =>
                setForm({ ...form, contactPhone: value })
              }
              keyboardType="phone-pad"
              style={{ textAlign: "left", writingDirection: "ltr" }}
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

          {error ? (
            <Text className="text-destructive">{error}</Text>
          ) : null}

          <Button
            label={t("address.save")}
            loading={create.isPending || update.isPending}
            onPress={submit}
          />
          <Button
            variant="ghost"
            label={t("common.cancel")}
            onPress={() => {
              setForm(null);
              setError(null);
            }}
          />
        </Card>
      )}
    </ScrollView>
  );
}
