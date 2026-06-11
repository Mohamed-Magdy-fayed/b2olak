import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { getToken } from "@/lib/session";
import { useTRPC } from "@/lib/trpc";

/** Entry: no token → auth; token → role-based shell (one app, two worlds). */
export default function Index() {
  const trpc = useTRPC();
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    void getToken().then((token) => setHasToken(token !== null));
  }, []);

  const me = useQuery({
    ...trpc.auth.me.queryOptions(),
    enabled: hasToken === true,
    retry: false,
  });

  if (hasToken === false) return <Redirect href="/(auth)/sign-in" />;
  if (me.isError) return <Redirect href="/(auth)/sign-in" />;
  if (me.data) {
    return me.data.user.role === "driver" ? (
      <Redirect href="/(driver)" />
    ) : (
      <Redirect href="/(customer)" />
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color="#7c3aed" />
    </View>
  );
}
