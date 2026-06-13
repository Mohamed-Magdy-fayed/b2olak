"use client";

import type { ColumnDef, Table } from "@tanstack/react-table";
import { useEffect, useRef } from "react";

import { Checkbox } from "@workspace/ui/components/checkbox";

/**
 * The target Checkbox is a plain native <input type="checkbox"> wrapper and
 * does not forward a ref or accept an `indeterminate` prop directly.
 * We use a wrapper that sets the native `.indeterminate` property via a ref.
 */
function IndeterminateCheckbox({
  checked,
  indeterminate,
  onCheckedChange,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  "aria-label"?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate ?? false;
    }
  }, [indeterminate]);

  return (
    <Checkbox
      ref={ref as React.Ref<HTMLInputElement>}
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
    />
  );
}

function SelectAllHeader<T>({ table }: { table: Table<T> }) {
  const some = table.getIsSomePageRowsSelected();
  const all = table.getIsAllPageRowsSelected();

  return (
    <IndeterminateCheckbox
      checked={all}
      indeterminate={some && !all}
      onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
      aria-label="Select all on page"
    />
  );
}

export function createSelectColumn<T>(): ColumnDef<T> {
  return {
    id: "select",
    size: 40,
    enablePinning: true,
    enableHiding: false,
    enableSorting: false,
    header: ({ table }) => <SelectAllHeader table={table} />,
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked)}
        aria-label="Select row"
      />
    ),
  };
}
