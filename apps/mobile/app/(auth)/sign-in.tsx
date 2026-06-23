import { useState } from "react"
import { Text, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useMutation } from "@tanstack/react-query"

import { egyptianPhoneSchema } from "@workspace/validators/auth"

import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import { KeyboardAvoidingView } from "@/components/ui/keyboard-screen"
import { Screen } from "@/components/ui/screen"
import { useAppForm } from "@/components/forms"
import { useTranslation } from "@/lib/i18n"
import { useTRPC } from "@/lib/trpc"

export default function SignInScreen() {
  const trpc = useTRPC()
  const { t } = useTranslation()
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>()
  const [error, setError] = useState<string | null>(null)

  const requestOtp = useMutation(
    trpc.auth.requestOtp.mutationOptions({
      onSuccess: (_data, variables) => {
        router.push({
          pathname: "/(auth)/verify",
          params: { phone: variables.phone, ...(returnTo ? { returnTo } : {}) },
        })
      },
      onError: (err) => {
        // The phone is already validated client-side before we get here, so a
        // server error means the code couldn't be sent — don't blame the number.
        setError(
          err.message === "errors.tooManyRequests"
            ? t("errors.tooManyRequests")
            : t("auth.otpSendFailed")
        )
      },
    })
  )

  const form = useAppForm({
    defaultValues: { phone: "" },
    onSubmit: ({ value }) => {
      setError(null)
      requestOtp.mutate({ phone: value.phone })
    },
  })

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1">
      <Screen padded>
        <View className="flex-1 justify-center gap-8">
          {/* Language toggle — top-end */}
          <View className="items-end">
            <LanguageToggle />
          </View>

          {/* Wordmark + subtitle */}
          <View className="items-center gap-3">
            <Text className="font-display text-5xl text-primary">
              {t("mobile.welcomeTitle")}
            </Text>
            <Text className="text-center text-base text-muted-foreground">
              {t("mobile.welcomeSubtitle")}
            </Text>
            {returnTo?.includes("checkout") ? (
              <View className="flex-row items-center gap-2">
                <Ionicons name="cart-outline" size={16} color="#C9A227" />
                <Text className="text-sm font-semibold text-primary">
                  {t("shop.cartSavedHint")}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Phone form */}
          <View className="gap-3">
            <form.AppField
              name="phone"
              validators={{
                onSubmit: ({ value }) =>
                  egyptianPhoneSchema.safeParse(value).success
                    ? undefined
                    : "validation.phoneInvalid",
              }}
            >
              {(field) => (
                <field.PhoneField
                  label={t("mobile.phoneLabel")}
                  placeholder={t("mobile.phonePlaceholder")}
                  autoFocus
                />
              )}
            </form.AppField>
            {error ? (
              <Text className="text-sm text-destructive">{error}</Text>
            ) : null}
            <Button
              label={
                requestOtp.isPending
                  ? t("mobile.sending")
                  : t("mobile.sendCode")
              }
              loading={requestOtp.isPending}
              onPress={() => void form.handleSubmit()}
            />
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  )
}
