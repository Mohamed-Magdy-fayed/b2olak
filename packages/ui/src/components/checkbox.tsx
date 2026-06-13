"use client";

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";

export type CheckboxProps = Omit<
  React.ComponentProps<"input">,
  "type" | "onChange"
> & {
  /** Controlled checked state. */
  checked?: boolean;
  /** Called with the new boolean value when the checkbox changes. */
  onCheckedChange?: (checked: boolean) => void;
};

/**
 * A styled native checkbox with an API compatible with the form system's
 * boolean field (checked / onCheckedChange).
 */
function Checkbox({
  className,
  checked,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={cn(
        "size-4 shrink-0 rounded-sm border border-input bg-transparent",
        "cursor-pointer accent-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Checkbox };
