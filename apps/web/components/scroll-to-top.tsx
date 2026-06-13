"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

import { useTranslation } from "@workspace/i18n/react";
import { Button } from "@workspace/ui/components/button";

export function ScrollToTop() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed bottom-6 end-6 z-50 rounded-full shadow-md"
      aria-label={t("common.scrollToTop")}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUp className="size-4" aria-hidden="true" />
    </Button>
  );
}
