import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getT } from "@/lib/i18n";

/** "Back to home" link rendered at the top of legal pages. */
export async function BackHome() {
  const { t } = await getT();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-8">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t("landing.footer.backHome")}
      </Link>
    </div>
  );
}
