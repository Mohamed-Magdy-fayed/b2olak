import { useCallback, useEffect, useRef, useState } from "react"
import { AppState, Text, View } from "react-native"
import { router, useLocalSearchParams, type Href } from "expo-router"
import { useMutation } from "@tanstack/react-query"

import { otpCodeSchema } from "@workspace/validators/auth"

import { BiometricEnableSheet } from "@/components/biometric-enable-sheet"
import { Button } from "@/components/ui/button"
import { DismissKeyboard } from "@/components/ui/dismiss-keyboard"
import { KeyboardAvoidingView } from "@/components/ui/keyboard-screen"
import { Screen, ScreenBackHeader } from "@/components/ui/screen"
import { useAppForm } from "@/components/forms"
import { authenticate, isBiometricAvailable } from "@/lib/biometric"
import { ensureDeviceRegistered } from "@/lib/device-auth"
import { useTranslation } from "@/lib/i18n"
import { getExpoPushToken } from "@/lib/notifications"
import {
  getActiveAccount,
  setAccountBiometric,
  upsertAccount,
} from "@/lib/session"
import { useTRPC } from "@/lib/trpc"
import { useSelector } from "@tanstack/react-store"

type Dest = Href

type PendingUser = {
  id: string
  role: string
  name: string | null
  phone: string | null
}

const RESEND_COOLDOWN_SECONDS = 60

export default function VerifyScreen() {
  const trpc = useTRPC()
  const { t } = useTranslation()
  const { phone, returnTo } = useLocalSearchParams<{
    phone: string
    returnTo?: string
  }>()
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)
  const [pendingDest, setPendingDest] = useState<Dest | null>(null)
  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null)
  const [enabling, setEnabling] = useState(false)
  // Guards against re-submitting the same code (auto-submit fires on the 6th
  // digit, which we only want to honor once per code).
  const submittedRef = useRef(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const registerPush = useMutation(
    trpc.auth.registerPushToken.mutationOptions()
  )

  const verify = useMutation(
    trpc.auth.verifyOtp.mutationOptions({
      onSuccess: async (data) => {
        await upsertAccount({
          userId: data.user.id,
          token: data.sessionId,
          role: data.user.role,
          name: data.user.name ?? "",
          phone: data.user.phone ?? "",
        })
        void getExpoPushToken().then((token) => {
          console.log("[push-debug] expo push token:", token ?? "null — not registered")
          if (token) registerPush.mutate({ token })
        })
        // Drivers always land in the captain shell; customers return to the
        // gated action they came from (e.g. checkout) when one was provided.
        const dest: Dest =
          data.user.role === "driver"
            ? "/(driver)"
            : returnTo
              ? (returnTo as Href)
              : "/(customer)"
        // Offer biometric unlock when the device supports it and this account
        // hasn't already saved it (per-account, so each account is offered).
        const active = await getActiveAccount()
        if ((await isBiometricAvailable()) && !active?.biometricEnabled) {
          setPendingUser({
            id: data.user.id,
            role: data.user.role,
            name: data.user.name,
            phone: data.user.phone,
          })
          setPendingDest(dest)
        } else {
          router.replace(dest)
        }
      },
      onError: (err) => {
        // Let the user (or a fresh clipboard read) trigger another attempt.
        submittedRef.current = false
        const key = err.message
        setError(
          key === "auth.otpExpired"
            ? t("auth.otpExpired")
            : key === "auth.otpTooManyAttempts"
              ? t("auth.otpTooManyAttempts")
              : key === "auth.suspended"
                ? t("auth.suspended")
                : t("auth.otpInvalid")
        )
      },
    })
  )

  const resend = useMutation(
    trpc.auth.requestOtp.mutationOptions({
      onSuccess: () => setCooldown(RESEND_COOLDOWN_SECONDS),
    })
  )

  const form = useAppForm({
    defaultValues: { code: "" },
    onSubmit: ({ value }) => {
      setError(null)
      verify.mutate({ phone, code: value.code })
    },
  })

  // Auto-verify once a valid 6-digit code is present (typed or filled), so the
  // user never has to reach for the Verify button.
  const code = useSelector(form.store, (s) => s.values.code)
  useEffect(() => {
    if (otpCodeSchema.safeParse(code).success && !submittedRef.current) {
      submittedRef.current = true
      void form.handleSubmit()
    } else if (code.length < 6) {
      submittedRef.current = false
    }
  }, [code, form])

  const enableBiometric = async () => {
    if (!pendingDest || !pendingUser) return
    setEnabling(true)
    const ok = await authenticate(t("auth.biometric.unlockPrompt"))
    if (ok) {
      await setAccountBiometric(pendingUser.id, true)
      // Register a device credential so biometric can re-login after a full
      // sign-out (no OTP). Best-effort — biometric unlock still works without it.
      try {
        await ensureDeviceRegistered({
          userId: pendingUser.id,
          role: pendingUser.role,
          name: pendingUser.name,
          phone: pendingUser.phone,
        })
      } catch {
        // ignore — device registration is an enhancement, not a gate
      }
    }
    setEnabling(false)
    router.replace(pendingDest)
  }

  const skipBiometric = () => {
    if (!pendingDest) return
    router.replace(pendingDest)
  }

  if (!phone) {
    router.replace("/(auth)/sign-in")
    return null
  }

  return (
    <>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <Screen padded>
          {/* Back to sign-in */}
          <ScreenBackHeader title="" />

          <DismissKeyboard>
            <View className="flex-1 justify-center gap-8">
              {/* Heading */}
              <View className="items-center gap-2">
                <Text className="font-display text-3xl text-primary">
                  {t("mobile.welcomeTitle")}
                </Text>
                <Text className="text-center text-base text-muted-foreground">
                  {t("mobile.codeSentTo", { phone })}
                </Text>
              </View>

              {/* OTP form */}
              <View className="gap-3">
                <form.AppField
                  name="code"
                  validators={{
                    onSubmit: ({ value }) =>
                      otpCodeSchema.safeParse(value).success
                        ? undefined
                        : "validation.otpInvalid",
                  }}
                >
                  {(field) => (
                    <field.StringField
                      label={t("mobile.codeLabel")}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                      ltr
                      sanitize={(text) => text.replace(/[^0-9]/g, "").slice(0, 6)}
                      className="text-2xl tracking-[8px]"
                    />
                  )}
                </form.AppField>
                {error ? (
                  <Text className="text-sm text-destructive">{error}</Text>
                ) : null}
                <Button
                  label={
                    verify.isPending ? t("mobile.verifying") : t("mobile.verify")
                  }
                  loading={verify.isPending}
                  onPress={() => void form.handleSubmit()}
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
          </DismissKeyboard>
        </Screen>
      </KeyboardAvoidingView>
      <BiometricEnableSheet
        visible={pendingDest !== null}
        busy={enabling}
        onEnable={() => void enableBiometric()}
        onSkip={() => void skipBiometric()}
      />
    </>
  )
}
