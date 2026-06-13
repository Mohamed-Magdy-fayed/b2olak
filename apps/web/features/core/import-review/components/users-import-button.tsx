"use client";

/**
 * NOTE: This component was ported from atelier-management-system but its
 * tRPC dependencies (`trpc.users.previewImport` / `trpc.users.commitImport`)
 * do not yet exist in ba2olak's API. The component is intentionally a no-op
 * stub that compiles cleanly. Wire it up once the users tRPC router is added.
 *
 * Original atelier imports removed:
 *   - @/integrations/trpc/client (useTRPC)
 *   - @/integrations/trpc/routers/users (UserImportCommitRow, UserImportPreviewRow, UserImportRole)
 */

export function UsersImportButton(_props: { role: string }) {
  // Stub — not yet connected to ba2olak tRPC.
  return null;
}
