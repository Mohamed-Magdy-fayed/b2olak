import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { I18nApp } from "@/lib/i18n";
import { ApiProvider } from "@/lib/trpc";

export default function RootLayout() {
  return (
    <ApiProvider>
      <I18nApp>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </I18nApp>
    </ApiProvider>
  );
}
