import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/button";
import { authenticate, isBiometricAvailable } from "@/lib/biometric";
import { useTranslation } from "@/lib/i18n";
import { setActiveAccount, type StoredAccount } from "@/lib/session";

/**
 * Cold-start chooser shown when more than one account is stored on the device
 * (e.g. a customer and a captain). Picking an account runs the local biometric
 * prompt — when enabled and available — before activating it, then hands the
 * chosen account back so the caller can route into the matching shell.
 */
export function AccountPicker({
  accounts,
  onPicked,
  onAddAccount,
}: {
  accounts: StoredAccount[];
  onPicked: (account: StoredAccount) => void;
  onAddAccount: () => void;
}) {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);

  const pick = async (account: StoredAccount) => {
    if (busyId) return;
    setBusyId(account.userId);
    try {
      const gated =
        Boolean(account.biometricEnabled) && (await isBiometricAvailable());
      if (gated) {
        const ok = await authenticate(t("auth.biometric.unlockPrompt"));
        if (!ok) return;
      }
      await setActiveAccount(account.userId);
      onPicked(account);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View className="flex-1 justify-center gap-6 bg-background p-6">
      <View className="items-center gap-2">
        <Text className="font-display text-4xl text-primary">
          {t("mobile.welcomeTitle")}
        </Text>
        <Text className="text-center text-muted-foreground">
          {t("auth.accounts.chooseSubtitle")}
        </Text>
      </View>

      <View className="gap-3">
        {accounts.map((account) => {
          const isDriver = account.role === "driver";
          return (
            <Pressable
              key={account.userId}
              disabled={busyId !== null}
              className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4 active:bg-elevated"
              onPress={() => void pick(account)}
            >
              <View className="size-11 items-center justify-center rounded-full bg-primary/10">
                <Ionicons
                  name={isDriver ? "car-outline" : "bag-handle-outline"}
                  size={22}
                  color="#C9A227"
                />
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="font-bold text-foreground">
                  {account.name || account.phone}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {isDriver
                    ? t("auth.accounts.captain")
                    : t("auth.accounts.customer")}
                  {account.name ? ` · ${account.phone}` : ""}
                </Text>
              </View>
              {busyId === account.userId ? (
                <ActivityIndicator size="small" color="#C9A227" />
              ) : (
                <Ionicons name="chevron-forward" size={18} color="#9B968C" />
              )}
            </Pressable>
          );
        })}
      </View>

      <Button
        variant="ghost"
        label={t("auth.accounts.addAnother")}
        disabled={busyId !== null}
        onPress={onAddAccount}
      />
    </View>
  );
}
