import "../global.css";

import { useEffect } from "react";
import { Stack, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { useMutation } from "@tanstack/react-query";

import { appFonts } from "@/lib/fonts";
import { I18nApp } from "@/lib/i18n";
import { getExpoPushToken, setupNotificationHandler } from "@/lib/notifications";
import { getToken } from "@/lib/session";
import { ApiProvider, useTRPC } from "@/lib/trpc";

setupNotificationHandler();
void SplashScreen.preventAutoHideAsync();

function PushSync() {
  const trpc = useTRPC();
  const register = useMutation(trpc.auth.registerPushToken.mutationOptions());

  useEffect(() => {
    void (async () => {
      const [sessionToken, pushToken] = await Promise.all([
        getToken(),
        getExpoPushToken(),
      ]);
      if (sessionToken && pushToken) {
        register.mutate({ token: pushToken });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(appFonts);

  useEffect(() => {
    // Hide the splash once fonts resolve — even on error, so we never hang.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ApiProvider>
      <I18nApp>
        <PushSync />
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </I18nApp>
    </ApiProvider>
  );
}
