import { Alert, AlertDescription } from "@workspace/ui/components/alert";

import { HealthBadge } from "@/components/health-badge";
import { LanguageToggle } from "@/components/language-toggle";
import { getT } from "@/lib/i18n";

export default async function Page() {
  const { t } = await getT();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <header className="absolute inset-e-6 top-6">
        <LanguageToggle />
      </header>

      <main className="flex max-w-md flex-col items-center gap-4 text-center">
        <h1 className="text-5xl font-black tracking-tight">
          {t("common.appName")}
        </h1>
        <p className="text-xl font-semibold">{t("home.tagline")}</p>
        <p className="text-muted-foreground">{t("home.subtitle")}</p>
        <HealthBadge />
        <Alert>
          <AlertDescription>{t("home.phaseBanner")}</AlertDescription>
        </Alert>
      </main>
    </div>
  );
}
