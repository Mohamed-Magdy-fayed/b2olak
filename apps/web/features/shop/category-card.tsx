import Link from "next/link";
import { ShoppingBasket } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

type CategoryCardProps = {
  id: string;
  nameEn: string;
  nameAr: string;
  imageUrl?: string | null;
  /** Current locale — determines which name to display */
  locale: string;
};

/**
 * Category card — links to /shop/category/{id}.
 * Shows the category image when available; otherwise a branded fallback.
 */
export function CategoryCard({ id, nameEn, nameAr, imageUrl, locale }: CategoryCardProps) {
  const displayName = locale === "ar" ? nameAr : nameEn;

  return (
    <Link
      href={`/shop/category/${id}`}
      className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 text-center transition-colors hover:bg-muted"
    >
      <div
        className={cn(
          "relative aspect-square w-full overflow-hidden rounded-lg bg-muted",
        )}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ShoppingBasket className="size-8 text-muted-foreground" aria-hidden="true" />
          </div>
        )}
      </div>
      <span className="line-clamp-2 text-xs font-bold text-foreground">
        {displayName}
      </span>
    </Link>
  );
}
