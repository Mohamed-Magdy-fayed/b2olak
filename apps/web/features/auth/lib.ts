export const OAUTH_NEXT_COOKIE_KEY = "oauthNext";

/** Only allow same-site relative paths as post-auth redirect targets. */
export function sanitizeNextPath(
  next: string | null | undefined,
): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

/** Where each role lands after signing in. */
export function postAuthPath(role: "admin" | "customer" | "driver", next?: string | null): string {
  if (role === "admin") return "/admin";
  if (role === "driver") return "/";
  return sanitizeNextPath(next) ?? "/shop";
}
