import "../global.css";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMutation } from "@tanstack/react-query";

import { I18nApp } from "@/lib/i18n";
import { getExpoPushToken, setupNotificationHandler } from "@/lib/notifications";
import { getToken } from "@/lib/session";
import { ApiProvider, useTRPC } from "@/lib/trpc";

setupNotificationHandler();

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
  return (
    <ApiProvider>
      <I18nApp>
        <PushSync />
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </I18nApp>
    </ApiProvider>
  );
}
