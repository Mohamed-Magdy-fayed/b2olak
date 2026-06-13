"use client";

import { Button } from "@workspace/ui/components/button";

type QtyStepperProps = {
  qty: number;
  onDecrement: () => void;
  onIncrement: () => void;
};

export function QtyStepper({ qty, onDecrement, onIncrement }: QtyStepperProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="size-8 rounded-full"
        onClick={onDecrement}
        aria-label="-"
      >
        −
      </Button>
      <span className="min-w-6 text-center text-sm font-bold tabular-nums">
        {qty}
      </span>
      <Button
        variant="default"
        size="icon"
        className="size-8 rounded-full"
        onClick={onIncrement}
        aria-label="+"
      >
        +
      </Button>
    </div>
  );
}
