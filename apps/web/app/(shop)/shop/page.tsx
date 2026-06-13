import { headers } from "next/headers";

import { createCallerFactory, createTRPCContext } from "@workspace/api/init";
import { appRouter } from "@workspace/api/root";

import { getT } from "@/lib/i18n";
import { getSession } from "@/lib/auth";
import { CategoryCard } from "@/features/shop/category-card";
import { ItemRowScroller } from "@/features/shop/item-row-scroller";

export default async function ShopPage() {
  const { t, locale } = await getT();

  const ctx = await createTRPCContext({ headers: await headers() });
  const caller = createCallerFactory(appRouter)(ctx);

  // Fetch public data in parallel
  const [categories, popularItems] = await Promise.all([
    caller.catalog.categories(),
    caller.catalog.popularItems(),
  ]);

  // "Buy again" row — only for logged-in users
  const session = await getSession();
  let reorderItems: typeof popularItems = [];
  if (session) {
    try {
      reorderItems = await caller.catalog.reorderItems();
    } catch {
      // Not critical — skip the row silently
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Buy again row */}
      {reorderItems.length > 0 && (
        <ItemRowScroller title={t("shop.buyAgain")} items={reorderItems} />
      )}

      {/* Popular now row */}
      {popularItems.length > 0 && (
        <ItemRowScroller title={t("shop.popularNow")} items={popularItems} />
      )}

      {/* Categories grid */}
      <section>
        <h2 className="mb-4 text-lg font-black text-foreground">
          {t("shop.categories")}
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              id={category.id}
              nameEn={category.nameEn}
              nameAr={category.nameAr}
              imageUrl={category.imageUrl}
              locale={locale}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
