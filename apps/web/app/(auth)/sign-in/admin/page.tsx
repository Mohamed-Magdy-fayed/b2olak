import { redirect } from "next/navigation";

import { postAuthPath } from "@/features/auth/lib";
import { SignInForm } from "@/features/auth/sign-in-form";
import { getSession } from "@/lib/auth";

export default async function StaffSignInPage() {
  const session = await getSession();
  if (session) redirect(postAuthPath(session.user.role));

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <SignInForm />
    </div>
  );
}
