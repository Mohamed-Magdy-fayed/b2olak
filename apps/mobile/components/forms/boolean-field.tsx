import { Switch, View } from "react-native"

import { Typography } from "@/components/ui/typography"
import { useFieldContext } from "./hooks"

export function FormBooleanField({ label }: { label: string }) {
  const field = useFieldContext<boolean>()

  return (
    <View className="flex-row items-center justify-between gap-3 py-1">
      <Typography className="flex-1 text-base text-foreground">{label}</Typography>
      <Switch
        value={field.state.value}
        onValueChange={(next) => field.handleChange(next)}
        trackColor={{ false: "#3A3A3F", true: "#C9A227" }}
        thumbColor="#F5F2EC"
      />
    </View>
  )
}
