import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { useTRPC } from "@/lib/trpc";

type FormState = {
  id?: string;
  label: string;
  city: string;
  area: string;
  street: string;
  building: string;
  floor: string;
  apartment: string;
  landmark: string;
  contactPhone: string;
  isDefault: boolean;
};

const emptyForm: FormState = {
  label: "",
  city: "",
  area: "",
  street: "",
  building: "",
  floor: "",
  apartment: "",
  landmark: "",
  contactPhone: "",
  isDefault: false,
};

export default function AddressesScreen() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const listOptions = trpc.addresses.list.queryOptions();
  const { data: addresses } = useQuery(listOptions);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: listOptions.queryKey });

  const create = useMutation(
    trpc.addresses.create.mutationOptions({
      onSuccess: () => {
        void invalidate();
        setForm(null);
      },
      onError: () => setError(t("validation.phoneInvalid")),
    }),
  );
  const update = useMutation(
    trpc.addresses.update.mutationOptions({
      onSuccess: () => {
        void invalidate();
        setForm(null);
      },
      onError: () => setError(t("validation.phoneInvalid")),
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
    const payload = {
      label: form.label || undefined,
      city: form.city,
      area: form.area,
      street: form.street,
      building: form.building || undefined,
      floor: form.floor || undefined,
      apartment: form.apartment || undefined,
      landmark: form.landmark || undefined,
      contactPhone: form.contactPhone,
      isDefault: form.isDefault,
    };
    if (form.id) update.mutate({ id: form.id, ...payload });
    else create.mutate(payload);
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
                  {address.label || address.area}
                  {address.isDefault ? " ⭐" : ""}
                </Text>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() =>
                      setForm({
                        id: address.id,
                        label: address.label ?? "",
                        city: address.city,
                        area: address.area,
                        street: address.street,
                        building: address.building ?? "",
                        floor: address.floor ?? "",
                        apartment: address.apartment ?? "",
                        landmark: address.landmark ?? "",
                        contactPhone: address.contactPhone,
                        isDefault: address.isDefault,
                      })
                    }
                  >
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
                {address.city}، {address.area}، {address.street}
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
          {(
            [
              ["label", t("address.label")],
              ["city", t("address.city")],
              ["area", t("address.area")],
              ["street", t("address.street")],
              ["building", t("address.building")],
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
          <View className="gap-1">
            <Text className="text-sm font-medium text-foreground">
              {t("address.contactPhone")}
            </Text>
            <Input
              value={form.contactPhone}
              onChangeText={(value) => setForm({ ...form, contactPhone: value })}
              keyboardType="phone-pad"
              style={{ textAlign: "left", writingDirection: "ltr" }}
            />
          </View>
          <Pressable
            className="flex-row items-center gap-2"
            onPress={() => setForm({ ...form, isDefault: !form.isDefault })}
          >
            <Text className="text-lg">{form.isDefault ? "☑" : "☐"}</Text>
            <Text className="text-foreground">{t("address.isDefault")}</Text>
          </Pressable>
          {error ? <Text className="text-destructive">{error}</Text> : null}
          <Button
            label={t("address.save")}
            loading={create.isPending || update.isPending}
            onPress={submit}
          />
          <Button
            variant="ghost"
            label={t("common.cancel")}
            onPress={() => setForm(null)}
          />
        </Card>
      )}
    </ScrollView>
  );
}
