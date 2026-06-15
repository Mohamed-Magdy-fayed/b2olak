import "../global.css"

import { useEffect } from "react"
import { Stack, SplashScreen } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useFonts } from "expo-font"
import { useMutation } from "@tanstack/react-query"
import { KeyboardProvider } from "react-native-keyboard-controller"
import * as SystemUI from "expo-system-ui"

import { SystemBars } from "@/components/system-bars"
import { appFonts } from "@/lib/fonts"
import { I18nApp } from "@/lib/i18n"
import { getExpoPushToken, setupNotificationHandler } from "@/lib/notifications"
import { getToken } from "@/lib/session"
import { ApiProvider, useTRPC } from "@/lib/trpc"

setupNotificationHandler()
void SplashScreen.preventAutoHideAsync()
// Match the root/window background to the app canvas so no white shows through
// the transparent (edge-to-edge) system bars or during keyboard/cold-start
// transitions. Mirrors the charcoal `background` token in tailwind.config.js.
void SystemUI.setBackgroundColorAsync("#0E0E10")

function PushSync() {
  const trpc = useTRPC()
  const register = useMutation(trpc.auth.registerPushToken.mutationOptions())

  useEffect(() => {
    void (async () => {
      const [sessionToken, pushToken] = await Promise.all([
        getToken(),
        getExpoPushToken(),
      ])
      if (sessionToken && pushToken) {
        register.mutate({ token: pushToken })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(appFonts)

  useEffect(() => {
    // Hide the splash once fonts resolve — even on error, so we never hang.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync()
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  return (
    <KeyboardProvider>
      <ApiProvider>
        <I18nApp>
          <PushSync />
          <SystemBars />
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }} />
        </I18nApp>
      </ApiProvider>
    </KeyboardProvider>
  )
}
