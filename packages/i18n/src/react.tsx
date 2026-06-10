"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_LOCALE,
  dictionaries,
  dirFor,
  FALLBACK_LOCALE,
  type Locale,
} from "./dictionaries";
import { createI18n, type LanguageMessages } from "./lib";

/**
 * Platform-agnostic provider — works in Next.js and React Native.
 * Side effects of switching locale (cookies, document.dir, I18nManager, app
 * reload) belong to the platform via `onLocaleChange`.
 */

type TranslationContextValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (locale: Locale) => void;
};

const TranslationContext = createContext<TranslationContextValue>({
  locale: DEFAULT_LOCALE,
  dir: dirFor(DEFAULT_LOCALE),
  setLocale: () => {},
});

export function TranslationProvider({
  defaultLocale = DEFAULT_LOCALE,
  onLocaleChange,
  children,
}: {
  defaultLocale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  const value = useMemo<TranslationContextValue>(
    () => ({
      locale,
      dir: dirFor(locale),
      setLocale: (next: Locale) => {
        setLocaleState(next);
        onLocaleChange?.(next);
      },
    }),
    [locale, onLocaleChange],
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation<
  const T extends Record<string, LanguageMessages>,
>(translations?: T) {
  const context = useContext(TranslationContext);

  const { t } = useMemo(
    () =>
      createI18n(translations ?? dictionaries, context.locale, FALLBACK_LOCALE),
    [translations, context.locale],
  );

  return {
    t,
    locale: context.locale,
    dir: context.dir,
    setLocale: context.setLocale,
  };
}
