import { redirect } from "next/navigation";

import { SignInForm } from "@/features/auth/sign-in-form";
import { getSession } from "@/lib/auth";

export default async function SignInPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <SignInForm />
    </div>
  );
}
