import { H1, H2, P } from "@workspace/ui/components/typography";

import { BackHome } from "@/features/marketing/back-home";
import { getT } from "@/lib/i18n";

/**
 * Example unlisted page. Reachable at /internal-preview-7f3a9c2e but not linked
 * anywhere and not indexed (noindex inherited from the (unlisted) layout).
 *
 * RENAME this folder to your own unguessable slug before relying on it as
 * "secret". Dogfoods the design-system Typography components (no raw <h1>).
 */
export default async function InternalPreviewPage() {
  const { locale } = await getT();
  const ar = locale === "ar";

  return (
    <>
      <BackHome />
      <article className="mx-auto w-full max-w-3xl px-4 py-12">
        <H1 className="mb-6 border-0">
          {ar ? "صفحة غير مُدرجة" : "Unlisted page"}
        </H1>
        <div className="flex flex-col gap-4">
          <P className="text-muted-foreground">
            {ar
              ? "الصفحة دي متاحة لأي حد معاه الرابط، لكن مش متلِنكة في أي مكان ومش بتظهر في محركات البحث."
              : "This page is reachable by anyone with the URL, but it isn't linked anywhere and search engines are told not to index it."}
          </P>
          <H2 className="border-0 pb-0">
            {ar ? "إزاي بتشتغل" : "How it works"}
          </H2>
          <P>
            {ar
              ? "أي صفحة جوه مجموعة المسار (unlisted) بتاخد noindex تلقائيًا. غيّر اسم الفولدر لرابط سري وبلاش تحطه في أي قائمة."
              : "Any page inside the (unlisted) route group inherits noindex automatically. Rename the folder to a secret slug and never add it to a menu."}
          </P>
        </div>
      </article>
    </>
  );
}
