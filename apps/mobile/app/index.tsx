import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";

import { BiometricLock } from "@/components/biometric-lock";
import { BiometricLogin } from "@/components/biometric-login";
import { getTrustedAccount, type TrustedAccount } from "@/lib/device-auth";
import { getAccounts, getToken, setActiveAccount, type StoredAccount } from "@/lib/session";

type Boot = {
  /** Truly signed in: a stored account whose token matches the active token. */
  activeAccount: StoredAccount | null;
  /** Remembered device that can biometric-login without an OTP. */
  trusted: TrustedAccount | null;
} | null;

/**
 * Entry. Fully local + deadlock-free:
 * - live session → optional biometric unlock → role shell
 * - no session but trusted device → biometric login (mints a session, no OTP)
 * - otherwise → guest storefront
 */
export default function Index() {
  const [boot, setBoot] = useState<Boot>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [loggedInRole, setLoggedInRole] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [token, accounts, trusted] = await Promise.all([
        getToken(),
        getAccounts(),
        getTrustedAccount(),
      ]);
      const activeAccount = token
        ? accounts.find((a) => a.token === token) ?? null
        : null;
      if (activeAccount && !activeAccount.biometricEnabled) setUnlocked(true);
      setBoot({ activeAccount, trusted });
    })();
  }, []);

  if (boot === null) return <Spinner />;

  // Live session present.
  if (boot.activeAccount) {
    if (boot.activeAccount.biometricEnabled && !unlocked) {
      return (
        <BiometricLock
          onUnlocked={async () => {
            await setActiveAccount(boot.activeAccount!.userId);
            setUnlocked(true);
          }}
        />
      );
    }
    return boot.activeAccount.role === "driver" ? (
      <Redirect href="/(driver)" />
    ) : (
      <Redirect href="/(customer)" />
    );
  }

  // Just minted a session via biometric device-login: route to its shell.
  if (loggedInRole) {
    return loggedInRole === "driver" ? (
      <Redirect href="/(driver)" />
    ) : (
      <Redirect href="/(customer)" />
    );
  }

  // No session but the device is trusted: offer biometric login. Cancelling
  // drops to the guest storefront.
  if (boot.trusted) {
    return (
      <BiometricLogin
        name={boot.trusted.name || boot.trusted.phone}
        onLoggedIn={(role) => setLoggedInRole(role)}
        onGuest={() => setBoot({ ...boot, trusted: null })}
      />
    );
  }

  // Guest-first: open the storefront rather than a wall.
  return <Redirect href="/(customer)" />;
}

function Spinner() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color="#C9A227" />
    </View>
  );
}
