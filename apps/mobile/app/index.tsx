import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { BiometricLock } from "@/components/biometric-lock";
import { getToken, isBiometricEnabled } from "@/lib/session";
import { useTRPC } from "@/lib/trpc";

type Boot = { hasToken: boolean; needsUnlock: boolean } | null;

/** Entry: no token → auth; token → optional biometric gate → role-based shell. */
export default function Index() {
  const trpc = useTRPC();
  const [boot, setBoot] = useState<Boot>(null);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    void (async () => {
      const token = await getToken();
      if (!token) {
        setBoot({ hasToken: false, needsUnlock: false });
        return;
      }
      const gated = await isBiometricEnabled();
      setBoot({ hasToken: true, needsUnlock: gated });
      if (!gated) setUnlocked(true);
    })();
  }, []);

  const me = useQuery({
    ...trpc.auth.me.queryOptions(),
    enabled: boot?.hasToken === true && unlocked,
    retry: false,
  });

  if (boot === null) return <Spinner />;
  if (!boot.hasToken) return <Redirect href="/(auth)/sign-in" />;
  if (boot.needsUnlock && !unlocked) {
    return <BiometricLock onUnlocked={() => setUnlocked(true)} />;
  }
  if (me.isError) return <Redirect href="/(auth)/sign-in" />;
  if (me.data) {
    return me.data.user.role === "driver" ? (
      <Redirect href="/(driver)" />
    ) : (
      <Redirect href="/(customer)" />
    );
  }

  return <Spinner />;
}

function Spinner() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color="#7c3aed" />
    </View>
  );
}
