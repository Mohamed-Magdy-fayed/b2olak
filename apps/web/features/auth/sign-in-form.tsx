"use client";

import { useActionState } from "react";

import { useTranslation } from "@workspace/i18n/react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import { signInAdminAction } from "./actions";

export function SignInForm() {
  const { t } = useTranslation();
  const [state, formAction, isPending] = useActionState(
    signInAdminAction,
    undefined,
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">{t("auth.signInTitle")}</CardTitle>
        <CardDescription>{t("auth.signInSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              dir="ltr"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              dir="ltr"
              required
            />
          </div>
          {state?.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {
                  // error values are i18n keys returned by the server action
                  t(state.error as never)
                }
              </AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? t("auth.signingIn") : t("auth.signIn")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
