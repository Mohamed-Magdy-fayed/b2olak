import Link from "next/link";

import { getT } from "@/lib/i18n";

import { DownloadButtons } from "./download-buttons";
import { WaitlistForm } from "./waitlist-form";

interface DownloadSectionProps {
  playStoreUrl: string | null;
  appStoreUrl: string | null;
}

/** Bottom #download section — server component. */
export async function DownloadSection({
  playStoreUrl,
  appStoreUrl,
}: DownloadSectionProps) {
  const { t } = await getT();
  const bothSet = Boolean(playStoreUrl && appStoreUrl);

  return (
    <section id="download" className="bg-primary py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-4 text-center">
        <h2 className="text-primary-foreground text-3xl font-black md:text-4xl">
          {t("landing.cta.title")}
        </h2>
        <p className="text-primary-foreground/80 max-w-lg text-lg">
          {t("landing.cta.body")}
        </p>

        {bothSet ? (
          <DownloadButtons
            playStoreUrl={playStoreUrl}
            appStoreUrl={appStoreUrl}
            variant="inverted"
          />
        ) : (
          <div className="flex w-full max-w-sm flex-col items-center gap-3">
            <p className="text-primary-foreground/80 max-w-sm text-sm">
              {t("landing.download.comingSoon")}
            </p>
            <WaitlistForm />
          </div>
        )}

        <Link
          href="/shop"
          className="text-primary-foreground mt-2 underline underline-offset-4 hover:text-primary-foreground/80"
        >
          {t("landing.download.orderOnWeb")}
        </Link>
      </div>
    </section>
  );
}
