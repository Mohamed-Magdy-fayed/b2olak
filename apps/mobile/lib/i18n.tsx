import { useCallback, useEffect, useState } from "react";
import { Alert, I18nManager, Platform } from "react-native";
import * as Updates from "expo-updates";

import {
  DEFAULT_LOCALE,
  dirFor,
  type Locale,
} from "@workspace/i18n/dictionaries";
import { TranslationProvider, useTranslation } from "@workspace/i18n/react";

import { getStoredLocale, setStoredLocale } from "./session";

export { useTranslation };

const isWeb = Platform.OS === "web";

function applyWebDir(locale: Locale) {
  if (typeof document !== "undefined") {
    document.documentElement.dir = dirFor(locale);
    document.documentElement.lang = locale;
  }
}

/**
 * Mobile i18n binding: persists locale and drives native RTL via I18nManager.
 * Platform constraint (docs/07-i18n-and-rtl.md): flipping layout direction
 * requires an app reload on native — we prompt and reload via expo-updates.
 * On the web preview, document.dir flips instantly instead.
 */
export function I18nApp({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale | null>(null);

  useEffect(() => {
    void (async () => {
      const stored = (await getStoredLocale()) ?? DEFAULT_LOCALE;
      if (isWeb) {
        applyWebDir(stored);
        setLocale(stored);
        return;
      }
      I18nManager.allowRTL(true);
      const wantsRTL = dirFor(stored) === "rtl";
      if (I18nManager.isRTL !== wantsRTL) {
        I18nManager.forceRTL(wantsRTL);
        // First launch with the default (ar) on an LTR-initialized app:
        // reload silently so the shell starts in the right direction.
        if (Updates.isEmbeddedLaunch) {
          try {
            await Updates.reloadAsync();
            return;
          } catch {
            // dev client without updates — continue, layout flips on next start
          }
        }
      }
      setLocale(stored);
    })();
  }, []);

  const onLocaleChange = useCallback((next: Locale) => {
    void (async () => {
      await setStoredLocale(next);
      if (isWeb) {
        applyWebDir(next);
        return;
      }
      const wantsRTL = dirFor(next) === "rtl";
      if (I18nManager.isRTL !== wantsRTL) {
        I18nManager.forceRTL(wantsRTL);
        Alert.alert(
          next === "ar" ? "إعادة تشغيل" : "Restart required",
          next === "ar"
            ? "هيعاد تشغيل التطبيق لتطبيق اتجاه اللغة."
            : "The app will restart to apply the new layout direction.",
          [
            {
              text: "OK",
              onPress: () => {
                void Updates.reloadAsync().catch(() => {});
              },
            },
          ],
        );
      }
    })();
  }, []);

  if (locale === null) return null; // splash stays visible during the async read

  return (
    <TranslationProvider defaultLocale={locale} onLocaleChange={onLocaleChange}>
      {children}
    </TranslationProvider>
  );
}
