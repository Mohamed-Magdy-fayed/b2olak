import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AddressFormModal,
  type EditableAddress,
} from "@/components/address-form-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSignedIn } from "@/lib/auth-gate";
import { useTranslation } from "@/lib/i18n";
import { useTabBarHeight } from "@/lib/use-tab-bar-height";
import { useTRPC } from "@/lib/trpc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddressesScreen() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();
  const signedIn = useSignedIn();
  const tabBarHeight = useTabBarHeight();
  // `null` = sheet closed, `"new"` = create, object = edit that address.
  const [editing, setEditing] = useState<EditableAddress | "new" | null>(null);

  // Address management is sign-in only; a guest who lands here is sent back.
  useEffect(() => {
    if (signedIn === false) router.replace("/(customer)");
  }, [signedIn]);

  const listOptions = trpc.addresses.list.queryOptions();
  const { data: addresses } = useQuery({
    ...listOptions,
    enabled: signedIn === true,
  });

  const remove = useMutation(
    trpc.addresses.delete.mutationOptions({
      onSuccess: () =>
        void queryClient.invalidateQueries({ queryKey: listOptions.queryKey }),
    }),
  );

  return (
    <>
      <ScrollView
        className="flex-1 bg-background px-4 pt-16"
        contentContainerClassName="gap-3"
        contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
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

        {(addresses ?? []).map((address) => (
          <Card key={address.id} className="gap-1">
            <View className="flex-row items-center justify-between">
              <Text className="font-bold text-foreground">
                {addressLabel(address, locale)}
                {address.isDefault ? " ⭐" : ""}
              </Text>
              <View className="flex-row gap-3">
                <Pressable onPress={() => setEditing(address)}>
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
        <Button label={t("address.add")} onPress={() => setEditing("new")} />
      </ScrollView>

      <AddressFormModal
        visible={editing !== null}
        address={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => setEditing(null)}
      />
    </>
  );
}
