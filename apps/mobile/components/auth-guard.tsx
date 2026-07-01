import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { router } from "expo-router";

import { getActiveAccount, getToken } from "@/lib/session";

/**
 * Wraps the customer/driver tab shells. The active token is the only thing that
 * keeps a user "signed in"; once it is cleared (sign out, or unlocking via the
 * OTP escape hatch) this guard boots them back to the entry router instead of
 * leaving them stranded inside an authed layout. Re-checks on app resume too.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const check = async () => {
      if (!(await getToken())) router.replace("/");
    };
    void check();
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") void check();
    });
    return () => sub.remove();
  }, []);

  return <>{children}</>;
}
