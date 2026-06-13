import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";

import { createCallerFactory, createTRPCContext } from "@workspace/api/init";
import { appRouter } from "@workspace/api/root";

import { getT } from "@/lib/i18n";

/** Server component — fetches up to 10 active categories and renders chip links. */
export async function CategoryTeaser() {
  const { t, locale } = await getT();

  const ctx = await createTRPCContext({ headers: await headers() });
  const caller = createCallerFactory(appRouter)(ctx);
  const allCategories = await caller.catalog.categories();
  const categories = allCategories.slice(0, 10);

  return (
    <section className="py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-4 text-center">
        <h2 className="text-3xl font-black md:text-4xl">
          {t("landing.categories.title")}
        </h2>
        <p className="text-muted-foreground max-w-lg">
          {t("landing.categories.subtitle")}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/shop/category/${cat.id}`}
              className="bg-card flex items-center gap-2 rounded-2xl border px-4 py-3 transition-colors hover:bg-muted"
            >
              {cat.imageUrl ? (
                <Image
                  src={cat.imageUrl}
                  alt=""
                  width={24}
                  height={24}
                  className="size-6 rounded object-cover"
                />
              ) : (
                <span aria-hidden="true">🛒</span>
              )}
              <span className="text-sm font-medium">
                {locale === "ar" ? cat.nameAr : cat.nameEn}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
