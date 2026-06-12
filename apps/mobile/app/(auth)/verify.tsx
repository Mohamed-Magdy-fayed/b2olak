import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { getExpoPushToken } from "@/lib/notifications";
import { setToken } from "@/lib/session";
import { useTRPC } from "@/lib/trpc";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyScreen() {
  const trpc = useTRPC();
  const { t } = useTranslation();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const registerPush = useMutation(trpc.auth.registerPushToken.mutationOptions());

  const verify = useMutation(
    trpc.auth.verifyOtp.mutationOptions({
      onSuccess: async (data) => {
        await setToken(data.sessionId);
        void getExpoPushToken().then((token) => {
          if (token) registerPush.mutate({ token });
        });
        router.replace(data.user.role === "driver" ? "/(driver)" : "/(customer)");
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

  if (!phone) {
    router.replace("/(auth)/sign-in");
    return null;
  }

  return (
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
  );
}
