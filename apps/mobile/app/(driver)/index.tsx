import { Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";

import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { clearToken } from "@/lib/session";
import { useTRPC } from "@/lib/trpc";

export default function DriverHome() {
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

  const approved = data?.driverProfile?.status === "approved";

  return (
    <View className="flex-1 bg-background p-6 pt-16">
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-black text-primary">
          {t("mobile.welcomeTitle")}
        </Text>
        <LanguageToggle />
      </View>

      <View className="flex-1 justify-center gap-4">
        {data && !approved ? (
          <Card className="items-center gap-2 border-warning p-6">
            <Text className="text-2xl font-bold text-foreground">
              {t("mobile.driverPendingTitle")}
            </Text>
            <Text className="text-center text-muted-foreground">
              {t("mobile.driverPendingBody")}
            </Text>
          </Card>
        ) : (
          <Card className="items-center gap-2 p-6">
            <Text className="text-2xl font-bold text-foreground">
              {t("mobile.driverHome")}
            </Text>
            <Text className="text-center text-muted-foreground">
              {t("mobile.driverHomeHint")}
            </Text>
            {data?.user.phone ? (
              <Text className="text-sm text-muted-foreground">
                {t("mobile.signedInAs", { phone: data.user.phone })}
              </Text>
            ) : null}
          </Card>
        )}
        <Button
          variant="outline"
          label={t("auth.signOut")}
          loading={signOut.isPending}
          onPress={() => signOut.mutate()}
        />
      </View>
    </View>
  );
}
