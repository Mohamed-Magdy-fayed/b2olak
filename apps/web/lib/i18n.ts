import { cookies, headers } from "next/headers";

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

/** First visit only (no cookie): honor the browser's Accept-Language ranking. */
function localeFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { lang: tag.trim().toLowerCase().split("-")[0] ?? "", q };
    })
    .filter((entry) => !Number.isNaN(entry.q))
    .sort((a, b) => b.q - a.q);
  const first = ranked.find((entry) => isLocale(entry.lang));
  return first ? (first.lang as Locale) : null;
}

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE_NAME)?.value;
  if (isLocale(value)) return value;
  const accepted = localeFromAcceptLanguage(
    (await headers()).get("accept-language"),
  );
  return accepted ?? DEFAULT_LOCALE;
}

export async function getT() {
  const locale = await getLocale();
  const { t } = createI18n(dictionaries, locale, FALLBACK_LOCALE);
  return { t, locale, dir: dirFor(locale) };
}
