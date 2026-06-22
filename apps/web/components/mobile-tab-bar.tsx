"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Children, type ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

// Pinned to the bottom of the viewport (not the document) so the bar stays on
// screen while the page scrolls. Taken out of flow — pair it with
// `mobileTabBarSpacerClassName` on the scrolling content so nothing hides behind it.
export const mobileTabBarShellClassName =
  "fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.08)] md:hidden";

// Bottom padding that reserves room for the fixed bar (its `h-15` row + the
// home-indicator safe area). Defined as a real class in globals.css because
// Tailwind v4 won't generate an arbitrary utility for calc()+nested env().
export const mobileTabBarSpacerClassName = "mobile-tabbar-spacer";

export function MobileTabBar({
  ariaLabel,
  columnCount,
  children,
}: {
  ariaLabel: string;
  columnCount?: number;
  children: ReactNode;
}) {
  const columns = columnCount ?? Children.count(children);

  return (
    <nav aria-label={ariaLabel} className={mobileTabBarShellClassName}>
      <div
        className="mx-auto grid h-16 max-w-lg"
        style={{
          gridTemplateColumns: `repeat(${Math.max(columns, 1)}, minmax(0, 1fr))`,
        }}
      >
        {children}
      </div>
    </nav>
  );
}

export function MobileTabLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      className={cn(
        "flex flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-medium transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground active:bg-muted/60",
      )}
      href={href}
    >
      <Icon className="size-[1.35rem] shrink-0" aria-hidden />
      <span className="line-clamp-2 text-center leading-tight">{label}</span>
    </Link>
  );
}

export function MobileTabButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-[0.625rem] font-medium text-muted-foreground transition-colors",
        "hover:text-foreground active:bg-muted/60",
      )}
      onClick={onClick}
    >
      <Icon className="size-[1.35rem] shrink-0" aria-hidden />
      <span className="line-clamp-2 text-center leading-tight">{label}</span>
    </button>
  );
}
