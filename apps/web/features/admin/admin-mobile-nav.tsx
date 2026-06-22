"use client";

import { MenuIcon } from "lucide-react";

import { useTranslation } from "@workspace/i18n/react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";

import { AdminNav } from "./admin-nav";

export function AdminMobileNav() {
  const { t } = useTranslation();

  return (
    <Sheet>
      <SheetTrigger
        aria-label={t("admin.mobileNavLabel")}
        className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:hidden"
      >
        <MenuIcon className="size-5" aria-hidden />
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle className="text-xl font-black text-primary">
            {t("common.appName")}
          </SheetTitle>
        </SheetHeader>
        <SheetBody>
          <AdminNav />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
