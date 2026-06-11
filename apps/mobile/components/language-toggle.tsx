import { useTranslation } from "@/lib/i18n";

import { Button } from "./ui/button";

export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();

  return (
    <Button
      variant="outline"
      size="sm"
      label={locale === "ar" ? "English" : "العربية"}
      onPress={() => setLocale(locale === "ar" ? "en" : "ar")}
    />
  );
}
