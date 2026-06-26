import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import {
  AddressFormModal,
  type EditableAddress,
} from "@/components/address-form-modal";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { useAppAlert } from "@/components/ui/app-alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen, ScreenBackHeader } from "@/components/ui/screen";
import { useSignedIn } from "@/lib/auth-gate";
import { useTranslation } from "@/lib/i18n";
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
  const appAlert = useAppAlert();
  const signedIn = useSignedIn();
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
      onError: (err) => appAlert(t("common.error"), err.message),
    }),
  );

  return (
    <>
      <Screen padded={false}>
        <ScreenBackHeader title={t("address.title")} className="px-4" />
        <ScrollView
          className="flex-1 px-4"
          contentContainerClassName="gap-3"
          contentContainerStyle={{ paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {(addresses ?? []).map((address) => (
            <Card key={address.id} className="gap-1">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center gap-1.5 me-2">
                  <Text className="font-bold text-foreground">
                    {addressLabel(address, locale)}
                  </Text>
                  {address.isDefault ? (
                    <Ionicons name="star" size={14} color="#C9A227" />
                  ) : null}
                </View>
                <View className="flex-row gap-4">
                  <Pressable hitSlop={16} onPress={() => setEditing(address)}>
                    <Text className="font-semibold text-primary">
                      {t("admin.common.edit")}
                    </Text>
                  </Pressable>
                  <Pressable hitSlop={16} onPress={() => remove.mutate({ id: address.id })}>
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
        </ScrollView>

        <BottomActionBar className="px-4">
          <Button label={t("address.add")} onPress={() => setEditing("new")} />
        </BottomActionBar>
      </Screen>

      <AddressFormModal
        visible={editing !== null}
        address={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => setEditing(null)}
      />
    </>
  );
}
