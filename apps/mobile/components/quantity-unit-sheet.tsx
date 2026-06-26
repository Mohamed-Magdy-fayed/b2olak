import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import {
  KeyboardProvider,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  clampQty,
  defaultQtyForKind,
  formatQty,
  isMoneyKind,
  presetsForKind,
  stepForKind,
  type UnitKind,
} from "@workspace/validators/units";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  cartLineFromItem,
  defaultUnitOf,
  useCart,
  type CartUnit,
  type CatalogItemForCart,
} from "@/lib/cart-store";
import { useTranslation } from "@/lib/i18n";
import { itemDisplayName } from "./item-row";

type Props = {
  item: CatalogItemForCart;
  visible: boolean;
  onClose: () => void;
  /** Preselect this unit + qty (edit mode); otherwise the item default. */
  initialUnitId?: string;
  initialQty?: number;
};

function unitName(u: CartUnit | undefined, locale: string): string {
  return u ? (locale === "ar" ? u.nameAr : u.nameEn) : "";
}

/**
 * Bottom-sheet quantity + unit picker — the single entry point for putting an
 * item in the cart. Offers a kind-aware quantity ladder (weight fractions,
 * money amounts, whole counts) plus the customer's recently-used amounts.
 */
export function QuantityUnitSheet({
  item,
  visible,
  onClose,
  initialUnitId,
  initialQty,
}: Props) {
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const add = useCart((s) => s.add);
  const rememberQty = useCart((s) => s.rememberQty);
  const recentQty = useCart((s) => s.recentQty);

  const [unitId, setUnitId] = useState("");
  const [qty, setQty] = useState(1);
  const [inputText, setInputText] = useState("");

  const selectedUnit = item.units.find((u) => u.id === unitId);
  const kind: UnitKind = selectedUnit?.kind ?? "count";

  // (Re)seed the sheet whenever it opens for a target.
  useEffect(() => {
    if (!visible) return;
    const start =
      item.units.find((u) => u.id === initialUnitId) ?? defaultUnitOf(item);
    const startQty = initialQty ?? (start ? defaultQtyForKind(start.kind) : 1);
    setUnitId(start?.id ?? "");
    setQty(startQty);
    setInputText(String(startQty));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, item.id, initialUnitId, initialQty]);

  const presets = useMemo(() => {
    if (!selectedUnit) return [] as number[];
    const recent = recentQty[selectedUnit.code] ?? [];
    return [...new Set([...presetsForKind(kind), ...recent])];
  }, [selectedUnit, kind, recentQty]);

  const applyQty = (next: number) => {
    const clamped = clampQty(next, kind);
    setQty(clamped);
    setInputText(String(clamped));
  };

  const onPickUnit = (u: CartUnit) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (u.id === unitId) return;
    setUnitId(u.id);
    // Reset to the new kind's default so we never carry e.g. 0.5 over to EGP.
    const def = defaultQtyForKind(u.kind);
    setQty(def);
    setInputText(String(def));
  };

  const summary = isMoneyKind(kind)
    ? t("shop.egpWorth", { amount: qty })
    : `${formatQty(qty, kind)} ${unitName(selectedUnit, locale)}`;

  const onConfirm = () => {
    if (!selectedUnit) return;
    add(cartLineFromItem(item, selectedUnit.id), qty);
    rememberQty(selectedUnit.code, qty);
    onClose();
  };

  const editing = initialQty != null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardProvider>
        <View className="flex-1 justify-end">
          {/* Backdrop sits behind the sheet without taking layout space, so the
              sheet stays bottom-anchored and rises cleanly with the keyboard. */}
          <Pressable className="absolute inset-0 bg-black/60" onPress={onClose} />
          <KeyboardStickyView>
            <View className="max-h-dvh rounded-t-2xl bg-card">
              {/* Drag handle */}
              <View className="items-center pt-3 pb-1">
                <View className="h-1 w-10 rounded-full bg-border" />
              </View>
              <View className="border-b border-border px-4 py-3">
                <Text className="text-center text-lg font-bold text-foreground" numberOfLines={1}>
                  {itemDisplayName(item, locale)}
                </Text>
                <Text className="text-center text-xs text-muted-foreground">
                  {t("shop.pickerTitle")}
                </Text>
              </View>

              <ScrollView
                className="px-4"
                contentContainerClassName="gap-4 py-4"
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
              >
                {/* Unit picker */}
                {item.units.length > 1 ? (
                  <View className="gap-2">
                    <Text className="font-medium text-foreground">{t("shop.pickerUnit")}</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {item.units.map((u) => {
                        const active = u.id === unitId;
                        return (
                          <Pressable
                            key={u.id}
                            onPress={() => onPickUnit(u)}
                            className={`rounded-full border px-3 py-1.5 ${active ? "border-primary bg-primary/10" : "border-border bg-elevated"
                              }`}
                          >
                            <Text className={active ? "font-semibold text-primary" : "text-foreground"}>
                              {unitName(u, locale)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {/* Quantity presets */}
                <View className="gap-2">
                  <Text className="font-medium text-foreground">{t("shop.pickerQuantity")}</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {presets.map((p) => {
                      const active = p === qty;
                      const label = isMoneyKind(kind)
                        ? t("shop.egpWorth", { amount: p })
                        : formatQty(p, kind);
                      return (
                        <Pressable
                          key={p}
                          onPress={() => {
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            applyQty(p);
                          }}
                          className={`rounded-full border px-3 py-1.5 ${active ? "border-primary bg-primary/10" : "border-border bg-elevated"
                            }`}
                        >
                          <Text className={active ? "font-semibold text-primary" : "text-foreground"}>
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Stepper + custom amount */}
                <View className="flex-row items-center gap-3">
                  <Pressable
                    className="size-11 items-center justify-center rounded-full bg-elevated active:opacity-70"
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      applyQty(qty - stepForKind(kind));
                    }}
                  >
                    <Ionicons name="remove" size={20} color="#9B968C" />
                  </Pressable>
                  <Input
                    className="flex-1 text-center"
                    keyboardType={kind === "weight" ? "decimal-pad" : "number-pad"}
                    value={inputText}
                    onChangeText={(text) => {
                      setInputText(text);
                      const parsed = Number(text);
                      if (Number.isFinite(parsed) && parsed > 0) setQty(parsed);
                    }}
                    onBlur={() => applyQty(qty)}
                    placeholder={t("shop.pickerCustom")}
                  />
                  <Pressable
                    className="size-11 items-center justify-center rounded-full bg-primary active:opacity-70"
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      applyQty(qty + stepForKind(kind));
                    }}
                  >
                    <Ionicons name="add" size={20} color="#0E0E10" />
                  </Pressable>
                </View>
              </ScrollView>

              <View
                className="gap-2 border-t border-border px-4 pt-3"
                style={{ paddingBottom: insets.bottom }}
              >
                <Button
                  label={`${editing ? t("shop.pickerUpdate") : t("shop.addToCart")} · ${summary}`}
                  disabled={!selectedUnit}
                  onPress={onConfirm}
                />
                <Button variant="ghost" label={t("common.cancel")} onPress={onClose} />
              </View>
            </View>
          </KeyboardStickyView>
        </View>
      </KeyboardProvider>
    </Modal>
  );
}
