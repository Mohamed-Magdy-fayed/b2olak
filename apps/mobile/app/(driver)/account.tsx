import { Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";

import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { clearToken } from "@/lib/session";
import { useTRPC } from "@/lib/trpc";

export default function DriverAccount() {
  const trpc = useTRPC();
  const { t } = useTranslation();
  const { data } = useQuery(trpc.auth.me.queryOptions());

  const signOut = useMutation(
    trpc.auth.signOut.mutationOptions({
      onSettled: async () => {
        await clearToken();
        router.replace("/(auth)/sign-in");
      },
    }),
  );

  return (
    <View className="flex-1 gap-4 bg-background px-4 pt-16">
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-black text-foreground">
          {t("driver.tabAccount")}
        </Text>
        <LanguageToggle />
      </View>

      <Card className="gap-1">
        <Text className="text-lg font-bold text-foreground">
          {data?.user.name ?? "—"}
        </Text>
        {data?.user.phone ? (
          <Text
            className="text-muted-foreground"
            style={{ writingDirection: "ltr" }}
          >
            {data.user.phone}
          </Text>
        ) : null}
      </Card>

      <Button
        variant="outline"
        label={t("auth.signOut")}
        loading={signOut.isPending}
        onPress={() => signOut.mutate()}
      />
    </View>
  );
}
