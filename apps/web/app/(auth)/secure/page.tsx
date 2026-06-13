import { SecurePrompt } from "@/features/auth/secure-prompt";

export default async function SecurePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const raw = sp.next;
  const safeNext =
    typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")
      ? raw
      : "/shop";

  return <SecurePrompt next={safeNext} />;
}
