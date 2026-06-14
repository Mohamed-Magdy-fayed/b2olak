import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";

import { AddressFormModal } from "@/components/address-form-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Screen, ScreenHeader } from "@/components/ui/screen";
import { itemDisplayName } from "@/components/item-row";
import { useSignedIn } from "@/lib/auth-gate";
import { useTranslation } from "@/lib/i18n";
import { useTabBarHeight } from "@/lib/use-tab-bar-height";
import { cartLineUnitName, useCart } from "@/lib/cart-store";
import { useTRPC } from "@/lib/trpc";

function addressDisplayName(
  address: {
    label: string | null;
    area: string;
    areaRef: { nameEn: string | null; nameAr: string | null } | null;
  },
  locale: string,
): string {
  if (address.label) return address.label;
  if (address.areaRef) {
    return (
      (locale === "ar" ? address.areaRef.nameAr : address.areaRef.nameEn) ??
      address.areaRef.nameAr ??
      address.areaRef.nameEn ??
      address.area
    );
  }
  return address.area;
}

function addressSubtitle(
  address: {
    area: string;
    street: string;
    building: string | null;
    districtRef: { nameEn: string | null; nameAr: string | null } | null;
    areaRef: { nameEn: string | null; nameAr: string | null } | null;
  },
  locale: string,
): string {
  const pickRef = (
    ref: { nameEn: string | null; nameAr: string | null } | null,
    fallback: string,
  ) =>
    (ref
      ? (locale === "ar" ? ref.nameAr : ref.nameEn) ?? ref.nameAr ?? ref.nameEn
      : null) ?? fallback;

  const district = pickRef(address.districtRef, address.area);
  const area = pickRef(address.areaRef, address.street);
  const parts = [district, area].filter(Boolean).join("، ");
  return address.building ? `${parts}، ${address.building}` : parts;
}

export default function CheckoutScreen() {
  const trpc = useTRPC();
  const { t, locale } = useTranslation();
  const signedIn = useSignedIn();
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const tabBarHeight = useTabBarHeight();

  const [addressId, setAddressId] = useState<string | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Checkout is the sign-in wall. A guest who reaches it (e.g. deep link) is
  // sent to sign-in and returned here afterwards.
  useEffect(() => {
    if (signedIn === false) {
      router.replace({
        pathname: "/(auth)/sign-in",
        params: { returnTo: "/(customer)/checkout" },
      });
    }
  }, [signedIn]);

  const { data: addresses } = useQuery({
    ...trpc.addresses.list.queryOptions(),
    enabled: signedIn === true,
  });
  const { data: fee } = useQuery(trpc.catalog.deliveryFee.queryOptions());

  const selected =
    addressId ?? addresses?.find((a) => a.isDefault)?.id ?? addresses?.[0]?.id;

  const place = useMutation(
    trpc.orders.place.mutationOptions({
      onSuccess: (data) => {
        clear();
        router.replace(`/(customer)/orders/${data.orderId}`);
      },
      onError: (err) => {
        setError(
          err.message === "errors.tooManyRequests"
            ? t("errors.tooManyRequests")
            : t("errors.unknown"),
        );
      },
    }),
  );

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1 px-5"
          contentContainerClassName="gap-4 pt-1"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader title={t("shop.checkout")} />

          <Card className="gap-2">
        {lines.map((line) => (
          <View key={line.itemId} className="flex-row justify-between">
            <Text className="flex-1 text-foreground">
              {itemDisplayName(line, locale)}
            </Text>
            <Text className="text-muted-foreground">
              {line.qty} × {cartLineUnitName(line, locale)}
            </Text>
          </View>
        ))}
        <View className="mt-2 flex-row justify-between border-t border-border pt-2">
          <Text className="font-semibold text-foreground">
            {t("shop.deliveryFee")}
          </Text>
          <Text className="font-bold text-foreground">
            {fee ? `${fee.amount} EGP` : "…"}
          </Text>
        </View>
        <Text className="text-xs text-muted-foreground">
          {t("shop.marketPriceNote")}
        </Text>
      </Card>

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold text-foreground">
            {t("shop.deliverTo")}
          </Text>
          <Pressable onPress={() => setAddingAddress(true)}>
            <Text className="font-semibold text-primary">
              {t("address.add")}
            </Text>
          </Pressable>
        </View>
        {(addresses ?? []).map((address) => (
          <Pressable
            key={address.id}
            onPress={() => setAddressId(address.id)}
            className={`rounded-2xl border p-4 ${
              selected === address.id
                ? "border-primary bg-primary/10"
                : "border-border bg-elevated"
            }`}
          >
            <Text className="font-semibold text-foreground">
              {addressDisplayName(address, locale)}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {addressSubtitle(address, locale)}
            </Text>
          </Pressable>
        ))}
        {addresses?.length === 0 ? (
          <Text className="text-muted-foreground">{t("address.none")}</Text>
        ) : null}
      </View>

          <View className="gap-2">
            <Text className="font-medium text-foreground">
              {t("shop.orderNote")}
            </Text>
            <Input value={note} onChangeText={setNote} />
          </View>

          {error ? <Text className="text-destructive">{error}</Text> : null}
        </ScrollView>

        {/* Fixed footer — keeps the primary CTA fully visible above the tab bar. */}
        <View
          className="border-t border-border bg-background px-5 pt-3"
          style={{ paddingBottom: tabBarHeight + 12 }}
        >
          <Button
            label={place.isPending ? t("shop.placing") : t("shop.placeOrder")}
            loading={place.isPending}
            disabled={!selected || lines.length === 0}
            onPress={() => {
              if (!selected) return;
              setError(null);
              place.mutate({
                addressId: selected,
                note: note.trim() || undefined,
                items: lines.map((line) => ({
                  itemId: line.itemId,
                  qty: line.qty,
                  unitId: line.unitId,
                  note: line.note,
                })),
              });
            }}
          />
        </View>
      </KeyboardAvoidingView>

      <AddressFormModal
        visible={addingAddress}
        onClose={() => setAddingAddress(false)}
        onSaved={(newId) => {
          setAddingAddress(false);
          setAddressId(newId);
        }}
      />
    </Screen>
  );
}
