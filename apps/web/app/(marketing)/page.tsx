import type { Metadata } from "next";

import { DownloadButtons } from "@/features/marketing/download-buttons";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getT();
  return {
    title: locale === "ar" ? "بقولك — اطلب، نشتري، نوصّلك" : "ba2olak — You want it. We deliver it.",
    description: t("landing.hero.subtitle"),
    openGraph: {
      title: t("common.appName"),
      description: t("landing.hero.subtitle"),
      locale: locale === "ar" ? "ar_EG" : "en_US",
      type: "website",
    },
  };
}

const CATEGORY_EMOJIS = ["🍅", "🥖", "🥛", "🍗", "🐟", "🧃", "🍫", "🧼", "🧴", "🍼"];

export default async function LandingPage() {
  const { t } = await getT();

  return (
    <div className="flex flex-col">
      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="bg-primary/10 absolute -top-32 -end-32 size-96 rounded-full blur-3xl" />
        <div className="bg-accent/20 absolute -bottom-32 -start-32 size-96 rounded-full blur-3xl" />
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-20 text-center md:py-28">
          <span className="bg-accent text-accent-foreground rounded-full px-4 py-1.5 text-sm font-bold">
            {t("landing.hero.badge")}
          </span>
          <h1 className="text-5xl font-black tracking-tight whitespace-pre-line md:text-7xl">
            {t("landing.hero.title")}
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg md:text-xl">
            {t("landing.hero.subtitle")}
          </p>
          <DownloadButtons />
        </div>
      </section>

      {/* how it works */}
      <section className="bg-muted/50 py-16">
        <div className="mx-auto w-full max-w-5xl px-4">
          <h2 className="mb-10 text-center text-3xl font-black md:text-4xl">
            {t("landing.how.title")}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {(
              [
                ["🛒", "landing.how.step1Title", "landing.how.step1Body"],
                ["🏃", "landing.how.step2Title", "landing.how.step2Body"],
                ["🛵", "landing.how.step3Title", "landing.how.step3Body"],
              ] as const
            ).map(([emoji, titleKey, bodyKey], index) => (
              <div
                key={titleKey}
                className="bg-card flex flex-col items-center gap-3 rounded-2xl border p-8 text-center"
              >
                <span className="text-5xl">{emoji}</span>
                <span className="bg-primary/10 text-primary rounded-full px-3 py-0.5 text-xs font-bold">
                  {index + 1}
                </span>
                <h3 className="text-xl font-bold">{t(titleKey)}</h3>
                <p className="text-muted-foreground">{t(bodyKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* categories teaser */}
      <section className="py-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-4 text-center">
          <h2 className="text-3xl font-black md:text-4xl">
            {t("landing.categories.title")}
          </h2>
          <p className="text-muted-foreground max-w-lg">
            {t("landing.categories.subtitle")}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {CATEGORY_EMOJIS.map((emoji) => (
              <span
                key={emoji}
                className="bg-card flex size-16 items-center justify-center rounded-2xl border text-3xl"
              >
                {emoji}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* bottom CTA */}
      <section id="download" className="bg-primary py-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-4 text-center">
          <h2 className="text-primary-foreground text-3xl font-black md:text-4xl">
            {t("landing.cta.title")}
          </h2>
          <p className="text-primary-foreground/80 max-w-lg text-lg">
            {t("landing.cta.body")}
          </p>
          <DownloadButtons variant="inverted" />
        </div>
      </section>
    </div>
  );
}
