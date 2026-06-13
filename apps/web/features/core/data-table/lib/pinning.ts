import type { Column } from "@tanstack/react-table";

import { cn } from "@workspace/ui/lib/utils";

/**
 * Matches legacy dress-rental `getCommonPinningStyles` (`src/lib/data-table.ts`).
 * Class names only — no inline `insetInlineStart` / `insetInlineEnd` (those caused the LTR edge gap).
 */
export function getPinningClassName<T>(
  column: Column<T>,
  options?: { withBorder?: boolean },
): string {
  const withBorder = options?.withBorder ?? false;
  const isPinned = column.getIsPinned();
  const isLastLeftPinnedColumn =
    isPinned === "left" && column.getIsLastColumn("left");
  const isFirstRightPinnedColumn =
    isPinned === "right" && column.getIsFirstColumn("right");

  if (!isPinned) {
    return "relative";
  }

  return cn(
    "sticky z-10 bg-inherit",
    isPinned === "left" && "start-0",
    isPinned === "right" && "end-0",
    withBorder &&
      isLastLeftPinnedColumn &&
      "shadow-[-4px_0_4px_-4px_hsl(var(--border))_inset]",
    withBorder &&
      isFirstRightPinnedColumn &&
      "shadow-[4px_0_4px_-4px_hsl(var(--border))_inset]",
  );
}
