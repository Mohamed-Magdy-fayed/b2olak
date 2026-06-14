import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation } from "@tanstack/react-query";

import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { useTRPC } from "@/lib/trpc";

export default function SignInScreen() {
  const trpc = useTRPC();
  const { t } = useTranslation();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const requestOtp = useMutation(
    trpc.auth.requestOtp.mutationOptions({
      onSuccess: () => {
        router.push({
          pathname: "/(auth)/verify",
          params: { phone, ...(returnTo ? { returnTo } : {}) },
        });
      },
      onError: (err) => {
        console.log(err);
        
        setError(
          err.message === "errors.tooManyRequests"
            ? t("errors.tooManyRequests")
            : t("validation.phoneInvalid"),
        );
      },
    }),
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <View className="flex-1 justify-center gap-6 p-6">
        <View className="items-end">
          <LanguageToggle />
        </View>
        <View className="items-center gap-2">
          <Text className="text-5xl font-black text-primary">
            {t("mobile.welcomeTitle")}
          </Text>
          <Text className="text-center text-lg text-muted-foreground">
            {t("mobile.welcomeSubtitle")}
          </Text>
          {returnTo?.includes("checkout") ? (
            <Text className="text-center font-semibold text-primary">
              🛒 {t("shop.cartSavedHint")}
            </Text>
          ) : null}
        </View>
        <View className="gap-3">
          <Text className="font-medium text-foreground">
            {t("mobile.phoneLabel")}
          </Text>
          <Input
            value={phone}
            onChangeText={(value) => {
              setError(null);
              setPhone(value);
            }}
            placeholder={t("mobile.phonePlaceholder")}
            keyboardType="phone-pad"
            autoComplete="tel"
            style={{ textAlign: "left", writingDirection: "ltr", direction: "ltr" }}
          />
          {error ? <Text className="text-destructive">{error}</Text> : null}
          <Button
            label={requestOtp.isPending ? t("mobile.sending") : t("mobile.sendCode")}
            loading={requestOtp.isPending}
            disabled={phone.trim().length < 10}
            onPress={() => requestOtp.mutate({ phone })}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
