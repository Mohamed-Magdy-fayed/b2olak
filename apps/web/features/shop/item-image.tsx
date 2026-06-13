import { Package } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

type ItemImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
};

/**
 * Presentational image cell for a catalog item.
 * Shows the image when available; otherwise a branded fallback with the
 * item's first letter (or a Package icon when there's no name).
 */
export function ItemImage({ src, alt, className }: ItemImageProps) {
  const firstLetter = alt.trim().charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-lg bg-muted",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          {firstLetter ? (
            <span className="select-none text-2xl font-black text-muted-foreground">
              {firstLetter}
            </span>
          ) : (
            <Package className="size-8 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
      )}
    </div>
  );
}
