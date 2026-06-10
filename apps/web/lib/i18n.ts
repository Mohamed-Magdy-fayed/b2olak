import { cookies } from "next/headers";

import {
  DEFAULT_LOCALE,
  dictionaries,
  dirFor,
  FALLBACK_LOCALE,
  isLocale,
  type Locale,
} from "@workspace/i18n/dictionaries";
import { createI18n, LOCALE_COOKIE_NAME } from "@workspace/i18n/lib";

/** Server-side i18n helpers (RSC). Client side lives in components/providers. */

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE_NAME)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getT() {
  const locale = await getLocale();
  const { t } = createI18n(dictionaries, locale, FALLBACK_LOCALE);
  return { t, locale, dir: dirFor(locale) };
}
