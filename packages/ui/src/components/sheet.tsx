"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

type Side = "left" | "right" | "bottom";

// `side` is RTL-aware: "left" anchors to the logical start edge (left in LTR,
// right in RTL) and "right" to the logical end edge. Position uses logical
// insets (start-0/end-0) and the slide direction is flipped under `dir="rtl"`
// via the `rtl:` translate overrides, so a drawer always opens from its edge.
const sideClasses: Record<Side, string> = {
  left: "inset-y-0 start-0 h-full w-72 border-e data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full rtl:data-[ending-style]:translate-x-full rtl:data-[starting-style]:translate-x-full",
  right:
    "inset-y-0 end-0 h-full w-72 border-s data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full rtl:data-[ending-style]:-translate-x-full rtl:data-[starting-style]:-translate-x-full",
  bottom:
    "inset-x-0 bottom-0 w-full max-h-[85svh] rounded-t-xl border-t data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full",
};

function SheetContent({
  className,
  children,
  side = "left",
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  side?: Side;
  showCloseButton?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
      <DialogPrimitive.Popup
        className={cn(
          "bg-background fixed z-50 flex flex-col shadow-xl transition-transform",
          sideClasses[side],
          className,
        )}
        {...props}
      >
        {showCloseButton && (
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute top-3 end-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-4" aria-hidden />
          </DialogPrimitive.Close>
        )}
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1 border-b p-4 pe-10", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      className={cn("text-base font-semibold", className)}
      {...props}
    />
  );
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex-1 overflow-y-auto p-4", className)} {...props} />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
};
