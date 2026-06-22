"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { useTranslation } from "@workspace/i18n/react";
import { cn } from "@workspace/ui/lib/utils";
import { AdminNav } from "./admin-nav";

export function AdminSidebar({
  signOutLabel,
  appName,
}: {
  signOutLabel: string;
  appName: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { locale } = useTranslation();
  const isRtl = locale === "ar";

  const CollapseIcon = collapsed
    ? isRtl ? ChevronLeft : ChevronRight
    : isRtl ? ChevronRight : ChevronLeft;

  return (
    <aside
      className={cn(
        "bg-sidebar hidden flex-col border-e border-border transition-all duration-200 md:flex",
        collapsed ? "w-14" : "w-56",
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-border px-4",
          collapsed ? "justify-center px-2" : "gap-2",
        )}
      >
        <Image
          src="/logo-mark.png"
          alt={appName}
          width={32}
          height={32}
          className={cn("shrink-0", collapsed ? "size-8" : "size-8")}
        />
        {!collapsed && (
          <span className="font-display text-xl font-black text-primary truncate">
            {appName}
          </span>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto p-2">
        <AdminNav collapsed={collapsed} />
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand" : "Collapse"}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            collapsed ? "justify-center px-2" : "",
          )}
        >
          <CollapseIcon style={{ width: 18, height: 18 }} aria-hidden />
          {!collapsed && <span className="text-xs">{locale === "ar" ? "طي" : "Collapse"}</span>}
        </button>
      </div>
    </aside>
  );
}
