import type { Metadata } from "next";
import { headers } from "next/headers";

import { Badge } from "@workspace/ui/components/badge";
import { Card } from "@workspace/ui/components/card";
import { createCallerFactory, createTRPCContext } from "@workspace/api/init";
import { appRouter } from "@workspace/api/root";

import { CategoryTeaser } from "@/features/marketing/category-teaser";
import { DownloadButtons } from "@/features/marketing/download-buttons";
import { DownloadSection } from "@/features/marketing/download-section";
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

export default async function LandingPage() {
  const { t } = await getT();

  const ctx = await createTRPCContext({ headers: await headers() });
  const caller = createCallerFactory(appRouter)(ctx);
  const { playStoreUrl, appStoreUrl } = await caller.catalog.storeLinks();

  return (
    <div className="flex flex-col">
      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="bg-primary/10 absolute -top-32 -end-32 size-96 rounded-full blur-3xl" />
        <div className="bg-accent/20 absolute -bottom-32 -start-32 size-96 rounded-full blur-3xl" />
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-20 text-center md:py-28">
          <Badge className="bg-accent text-accent-foreground rounded-full border-transparent px-4 py-1.5 text-sm font-bold">
            {t("landing.hero.badge")}
          </Badge>
          <h1 className="text-5xl font-black tracking-tight whitespace-pre-line md:text-7xl">
            {t("landing.hero.title")}
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg md:text-xl">
            {t("landing.hero.subtitle")}
          </p>
          <DownloadButtons
            playStoreUrl={playStoreUrl}
            appStoreUrl={appStoreUrl}
          />
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
              <Card
                key={titleKey}
                className="relative items-center gap-3 rounded-2xl p-8 text-center"
              >
                <Badge className="bg-primary/10 text-primary absolute top-4 start-4 rounded-full border-transparent px-3 py-0.5 font-bold">
                  {index + 1}
                </Badge>
                <span className="text-5xl">{emoji}</span>
                <h3 className="text-xl font-bold">{t(titleKey)}</h3>
                <p className="text-muted-foreground">{t(bodyKey)}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* categories teaser */}
      <CategoryTeaser />

      {/* bottom CTA / download / waitlist */}
      <DownloadSection playStoreUrl={playStoreUrl} appStoreUrl={appStoreUrl} />
    </div>
  );
}
