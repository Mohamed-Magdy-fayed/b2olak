import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { getActiveAccount, getToken } from "@/lib/session";

/**
 * Guest-first gate. Browsing and cart-building are open to everyone; the
 * sign-in ask appears only at commit points (checkout, adding a catalog item).
 * Returns true when already signed in; otherwise sends the user to sign-in with
 * a `returnTo` so they land back on the action after authenticating.
 */
export async function ensureSignedIn(returnTo: string): Promise<boolean> {
  if (await getToken()) return true;
  router.push({ pathname: "/(auth)/sign-in", params: { returnTo } });
  return false;
}

/**
 * Reactive auth flag for guest-aware screens. `null` while first resolving, so
 * callers can avoid flashing the wrong state. Re-checks on focus and on app
 * resume (e.g. after returning from the sign-in flow).
 */
export function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  const check = useCallback(() => {
    void getToken().then((token) => setSignedIn(Boolean(token)));
  }, []);

  useFocusEffect(check);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => sub.remove();
  }, [check]);

  return signedIn;
}

/**
 * Reactive auth flag for guest-aware screens. `null` while first resolving, so
 * callers can avoid flashing the wrong state. Re-checks on focus and on app
 * resume (e.g. after returning from the sign-in flow).
 */
export function useSignedInCustomerPhone(): string {
  const [signedInCustomerPhone, setSignedInCustomerPhone] = useState<string>("");

  const check = useCallback(() => {
    void getActiveAccount().then((account) => setSignedInCustomerPhone(account?.phone ?? ""));
  }, []);

  useFocusEffect(check);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => sub.remove();
  }, [check]);

  return signedInCustomerPhone;
}
