"use client";

import { useState } from "react";
import { Package } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import { Skeleton } from "@workspace/ui/components/skeleton";

type ItemImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
};

export function ItemImage({ src, alt, className }: ItemImageProps) {
  const [loaded, setLoaded] = useState(false);
  const firstLetter = alt.trim().charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-xl bg-accent",
        className,
      )}
    >
      {src ? (
        <>
          {!loaded && <Skeleton className="absolute inset-0 size-full rounded-none" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0",
            )}
          />
        </>
      ) : (
        <div className="flex size-full items-center justify-center">
          {firstLetter ? (
            <span className="select-none font-display text-2xl font-black text-primary">
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
