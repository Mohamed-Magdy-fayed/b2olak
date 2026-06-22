"use client";

import Link from "next/link";
import {
  Languages,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  User,
} from "lucide-react";

import { useTranslation } from "@workspace/i18n/react";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { signOutAction } from "./actions";
import { PropsWithChildren } from "react";

/**
 * Unified auth-manager menu for the shop/marketing headers. One entry point for
 * profile, security (passkeys + trusted devices), language, and a clearly
 * labelled sign-out — replacing the bare icon-only sign-out button.
 */
export function AuthManagerMenu({
  user,
  children,
}: PropsWithChildren<{
  user: { name: string | null; role: string; phone: string | null };
}>) {
  const { t, locale, setLocale } = useTranslation();
  const isAdmin = user.role === "admin";

  const initials = user.name
    ? user.name
      .trim()
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("")
    : "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="gap-2" />}
      >
        {children ? children : (
          <>
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {initials}
            </span>
            <span className="max-w-32 truncate">
              {user.name ?? t("shop.tabAccount")}
            </span>
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block truncate text-sm font-medium text-foreground">
              {user.name ?? t("shop.tabAccount")}
            </span>
            {user.phone ? (
              <span dir="ltr" className="block text-start text-xs text-muted-foreground">
                {user.phone}
              </span>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        {isAdmin ? (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <LayoutDashboard />
            {t("admin.title")}
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem render={<Link href="/account" />}>
              <User />
              {t("account.title")}
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/account/security" />}>
              <ShieldCheck />
              {t("account.security" as never)}
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuItem
          onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
        >
          <Languages />
          {locale === "ar" ? "English" : "العربية"}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            void signOutAction();
          }}
        >
          <LogOut className="rtl:rotate-180" />
          {t("auth.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
