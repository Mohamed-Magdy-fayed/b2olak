"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { useTranslation } from "@workspace/i18n/react";
import { buttonVariants } from "@workspace/ui/components/button";

import { useCart } from "@/features/shop/cart-store";
import { cn } from "@workspace/ui/lib/utils";

export function CartButton() {
  const { t } = useTranslation();
  const lines = useCart((s) => s.lines);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const count = mounted
    ? lines.reduce((acc, l) => acc + l.qty, 0)
    : 0;

  return (
    <Link
      href="/cart"
      aria-label={t("shop.tabCart")}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "relative gap-1.5",
      )}
    >
      <ShoppingCart className="size-4" aria-hidden="true" />
      {mounted && count > 0 && (
        <span className="absolute -end-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
