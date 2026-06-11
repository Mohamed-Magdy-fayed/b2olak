import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@workspace/ui/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-transparent",
        secondary: "bg-secondary text-secondary-foreground border-transparent",
        destructive: "bg-destructive/10 text-destructive border-destructive/30",
        outline: "text-foreground",
        success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
        warning: "bg-amber-500/10 text-amber-600 border-amber-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
