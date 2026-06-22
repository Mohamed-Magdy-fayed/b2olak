import Link from "next/link";

import { cn } from "@workspace/ui/lib/utils";

type CategoryCardProps = {
  id: string;
  nameEn: string;
  nameAr: string;
  imageUrl?: string | null;
  locale: string;
};

export function CategoryCard({ id, nameEn, nameAr, imageUrl, locale }: CategoryCardProps) {
  const displayName = locale === "ar" ? nameAr : nameEn;
  const firstLetter = displayName.trim().charAt(0).toUpperCase();

  return (
    <Link
      href={`/shop/category/${id}`}
      className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition-colors hover:bg-accent active:scale-95"
    >
      <div className={cn("relative aspect-square w-full overflow-hidden rounded-xl bg-accent")}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-primary/10">
            <span className="select-none font-display text-3xl font-black text-primary">
              {firstLetter}
            </span>
          </div>
        )}
      </div>
      <span className="line-clamp-2 text-xs font-bold text-foreground">
        {displayName}
      </span>
    </Link>
  );
}
