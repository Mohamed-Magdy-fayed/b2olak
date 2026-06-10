"use client";

import { Button } from "@workspace/ui/components/button";
import { useTranslation } from "@workspace/i18n/react";

export function LanguageToggle() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={t("common.language")}
      onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
    >
      {locale === "ar" ? "English" : "العربية"}
    </Button>
  );
}
