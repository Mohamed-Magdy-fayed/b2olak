import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

// Fixed bar pinned to the bottom of the viewport for a page's primary action(s).
// On small screens it sits ABOVE the mobile tab bar (which is `fixed bottom-0
// z-40 h-15 + safe-area, md:hidden`); on `md` the tab bar is gone so the bar
// drops to `bottom-0` and owns the home-indicator safe area itself.
//
// Pair the page's scrolling content with `stickyActionBarSpacerClassName` so the
// last content isn't hidden behind the bar.
export const stickyActionBarSpacerClassName = "pb-28"; // ~7rem, clears py-3 + lg button

export function StickyActionBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur",
        // above the tab bar on mobile; flush to the bottom on desktop
        "bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-0",
        "md:pb-[env(safe-area-inset-bottom)]",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-lg px-4 py-3">{children}</div>
    </div>
  );
}
