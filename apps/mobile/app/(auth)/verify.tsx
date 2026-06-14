import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useMutation } from "@tanstack/react-query";

import { BiometricEnableSheet } from "@/components/biometric-enable-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authenticate, isBiometricAvailable } from "@/lib/biometric";
import { ensureDeviceRegistered } from "@/lib/device-auth";
import { useTranslation } from "@/lib/i18n";
import { getExpoPushToken } from "@/lib/notifications";
import {
  getActiveAccount,
  setAccountBiometric,
  upsertAccount,
} from "@/lib/session";
import { useTRPC } from "@/lib/trpc";

type Dest = Href;

type PendingUser = {
  id: string;
  role: string;
  name: string | null;
  phone: string | null;
};

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyScreen() {
  const trpc = useTRPC();
  const { t } = useTranslation();
  const { phone, returnTo } = useLocalSearchParams<{
    phone: string;
    returnTo?: string;
  }>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [pendingDest, setPendingDest] = useState<Dest | null>(null);
  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const registerPush = useMutation(trpc.auth.registerPushToken.mutationOptions());

  const verify = useMutation(
    trpc.auth.verifyOtp.mutationOptions({
      onSuccess: async (data) => {
        await upsertAccount({
          userId: data.user.id,
          token: data.sessionId,
          role: data.user.role,
          name: data.user.name ?? "",
          phone: data.user.phone ?? "",
        });
        void getExpoPushToken().then((token) => {
          if (token) registerPush.mutate({ token });
        });
        // Drivers always land in the captain shell; customers return to the
        // gated action they came from (e.g. checkout) when one was provided.
        const dest: Dest =
          data.user.role === "driver"
            ? "/(driver)"
            : returnTo
              ? (returnTo as Href)
              : "/(customer)";
        // Offer biometric unlock when the device supports it and this account
        // hasn't already saved it (per-account, so each account is offered).
        const active = await getActiveAccount();
        if ((await isBiometricAvailable()) && !active?.biometricEnabled) {
          setPendingUser({
            id: data.user.id,
            role: data.user.role,
            name: data.user.name,
            phone: data.user.phone,
          });
          setPendingDest(dest);
        } else {
          router.replace(dest);
        }
      },
      onError: (err) => {
        const key = err.message;
        setError(
          key === "auth.otpExpired"
            ? t("auth.otpExpired")
            : key === "auth.otpTooManyAttempts"
              ? t("auth.otpTooManyAttempts")
              : key === "auth.suspended"
                ? t("auth.suspended")
                : t("auth.otpInvalid"),
        );
      },
    }),
  );

  const resend = useMutation(
    trpc.auth.requestOtp.mutationOptions({
      onSuccess: () => setCooldown(RESEND_COOLDOWN_SECONDS),
    }),
  );

  const enableBiometric = async () => {
    if (!pendingDest || !pendingUser) return;
    setEnabling(true);
    const ok = await authenticate(t("auth.biometric.unlockPrompt"));
    if (ok) {
      await setAccountBiometric(pendingUser.id, true);
      // Register a device credential so biometric can re-login after a full
      // sign-out (no OTP). Best-effort — biometric unlock still works without it.
      try {
        await ensureDeviceRegistered({
          userId: pendingUser.id,
          role: pendingUser.role,
          name: pendingUser.name,
          phone: pendingUser.phone,
        });
      } catch {
        // ignore — device registration is an enhancement, not a gate
      }
    }
    setEnabling(false);
    router.replace(pendingDest);
  };

  const skipBiometric = () => {
    if (!pendingDest) return;
    router.replace(pendingDest);
  };

  if (!phone) {
    router.replace("/(auth)/sign-in");
    return null;
  }

  return (
    <>
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <View className="flex-1 justify-center gap-6 p-6">
        <View className="items-center gap-2">
          <Text className="text-3xl font-black text-primary">
            {t("mobile.welcomeTitle")}
          </Text>
          <Text className="text-center text-muted-foreground">
            {t("mobile.codeSentTo", { phone })}
          </Text>
        </View>
        <View className="gap-3">
          <Text className="font-medium text-foreground">
            {t("mobile.codeLabel")}
          </Text>
          <Input
            value={code}
            onChangeText={(value) => {
              setError(null);
              setCode(value.replace(/[^0-9]/g, "").slice(0, 6));
            }}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6}
            className="text-center text-2xl tracking-[8px]"
            style={{ textAlign: "center", writingDirection: "ltr" }}
          />
          {error ? <Text className="text-destructive">{error}</Text> : null}
          <Button
            label={verify.isPending ? t("mobile.verifying") : t("mobile.verify")}
            loading={verify.isPending}
            disabled={code.length !== 6}
            onPress={() => verify.mutate({ phone, code })}
          />
          <Button
            variant="ghost"
            label={
              cooldown > 0
                ? t("mobile.resendIn", { seconds: String(cooldown) })
                : t("mobile.resend")
            }
            disabled={cooldown > 0 || resend.isPending}
            onPress={() => resend.mutate({ phone })}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
    <BiometricEnableSheet
      visible={pendingDest !== null}
      busy={enabling}
      onEnable={() => void enableBiometric()}
      onSkip={() => void skipBiometric()}
    />
    </>
  );
}
