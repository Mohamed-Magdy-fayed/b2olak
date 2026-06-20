import type { Metadata } from "next";

/**
 * Layout for "unlisted but public" pages — reachable by anyone with the URL, but
 * never linked and never indexed. Every page placed under this `(unlisted)` route
 * group inherits `noindex, nofollow` automatically, so it can't be forgotten.
 *
 * This is security-through-obscurity, NOT auth. Don't put anything truly sensitive
 * here — gate that with a per-page `getSession()` check instead.
 * See docs/10-design-system.md → "Page visibility".
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function UnlistedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
