"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { dirFor, type Locale } from "@workspace/i18n/dictionaries";
import { LOCALE_COOKIE_NAME } from "@workspace/i18n/lib";
import { TranslationProvider } from "@workspace/i18n/react";

/**
 * Web binding for the shared i18n provider: persists the locale in a cookie,
 * flips document.dir immediately, and refreshes server components.
 */
export function I18nProvider({
  defaultLocale,
  children,
}: {
  defaultLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const onLocaleChange = useCallback(
    (locale: Locale) => {
      const dir = dirFor(locale);
      document.dir = dir;
      document.documentElement.setAttribute("dir", dir);
      document.documentElement.setAttribute("lang", locale);
      document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; path=/; samesite=lax; max-age=31536000`;
      router.refresh();
    },
    [router],
  );

  return (
    <TranslationProvider
      defaultLocale={defaultLocale}
      onLocaleChange={onLocaleChange}
    >
      {children}
    </TranslationProvider>
  );
}
