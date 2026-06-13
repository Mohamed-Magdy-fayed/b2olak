import type { ColumnPinningState } from "@tanstack/react-table";

/**
 * Default pinning for all admin entity tables (`useDataTable` and server-driven pages).
 * Select at inline-start, actions at inline-end; RTL is handled via logical CSS on cells.
 */
export function getEntityColumnPinning(): ColumnPinningState {
  return { left: ["select"], right: ["actions"] };
}
