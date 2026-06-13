import Link from "next/link";
import { headers } from "next/headers";

import { createCallerFactory, createTRPCContext } from "@workspace/api/init";
import { appRouter } from "@workspace/api/root";

import { getT } from "@/lib/i18n";

export default async function ShopPage() {
  const { t, locale } = await getT();

  const ctx = await createTRPCContext({ headers: await headers() });
  const caller = createCallerFactory(appRouter)(ctx);
  const categories = await caller.catalog.categories();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-black text-foreground">
        {t("shop.categories")}
      </h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/shop/category/${category.id}`}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-6 text-center transition-colors hover:bg-muted"
          >
            <span className="text-3xl">🛒</span>
            <span className="text-sm font-bold text-foreground">
              {locale === "ar" ? category.nameAr : category.nameEn}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
