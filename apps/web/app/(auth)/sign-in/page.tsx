import { redirect } from "next/navigation";

import { CustomerSignIn } from "@/features/auth/customer-sign-in";
import { postAuthPath, sanitizeNextPath } from "@/features/auth/lib";
import { getSession } from "@/lib/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; oauthError?: string }>;
}) {
  const params = await searchParams;
  const next = sanitizeNextPath(params.next);

  const session = await getSession();
  if (session) redirect(postAuthPath(session.user.role, next));

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <CustomerSignIn next={next} oauthError={params.oauthError ?? null} />
    </div>
  );
}
