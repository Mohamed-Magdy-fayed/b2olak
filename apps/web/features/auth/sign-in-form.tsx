"use client";

import { useState, useTransition } from "react";

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
import { signInPasswordSchema } from "@workspace/validators/auth";

import { useAppForm } from "@/components/forms/hooks";
import { signInAdminAction } from "./actions";

export function SignInForm() {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: signInPasswordSchema },
    onSubmit: ({ value }) => {
      setError(null);
      startTransition(async () => {
        const fd = new FormData();
        fd.set("email", value.email);
        fd.set("password", value.password);
        const result = await signInAdminAction(undefined, fd);
        if (result?.error) setError(result.error);
      });
    },
  });

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">{t("auth.signInTitle")}</CardTitle>
        <CardDescription>{t("auth.signInSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="flex flex-col gap-4"
        >
          <form.AppField name="email">
            {(field) => (
              <field.StringField
                label={t("auth.email")}
                inputType="email"
                dir="ltr"
                autoComplete="email"
              />
            )}
          </form.AppField>
          <form.AppField name="password">
            {(field) => (
              <field.PasswordField
                label={t("auth.password")}
                autoComplete="current-password"
              />
            )}
          </form.AppField>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{t(error as never)}</AlertDescription>
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
