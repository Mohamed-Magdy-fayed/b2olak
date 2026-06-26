import { useEffect } from "react"
import { I18nManager, type DimensionValue, Pressable, Text, View } from "react-native"
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import * as Haptics from "expo-haptics"

import { glowShadow } from "@/lib/shadows"

// How long the motorcycle takes to cross the button once.
const MOTO_DURATION = 1800
// Item drop cycle: appear → fall → invisible pause → repeat
const DROP_APPEAR = 200
const DROP_FALL = 700
const DROP_PAUSE = 500 // invisible gap before next drop
const DROP_CYCLE = DROP_APPEAR + DROP_FALL + DROP_PAUSE

const RTL = I18nManager.isRTL

type Props = {
  label: string
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
}

export function PlaceOrderButton({ label, onPress, disabled, loading }: Props) {
  const inactive = disabled || loading

  const labelOpacity = useSharedValue(1)
  const sceneOpacity = useSharedValue(0)
  // Motorcycle x: 0 = left edge, 1 = right edge (normalized, mapped in style)
  const motoProgress = useSharedValue(0)

  useEffect(() => {
    if (loading) {
      labelOpacity.value = withTiming(0, { duration: 180 })
      sceneOpacity.value = withTiming(1, { duration: 180 })
      motoProgress.value = 0
      motoProgress.value = withRepeat(
        withTiming(1, { duration: MOTO_DURATION, easing: Easing.linear }),
        -1,
        false,
      )
    } else {
      cancelAnimation(motoProgress)
      sceneOpacity.value = withTiming(0, { duration: 180 })
      labelOpacity.value = withTiming(1, { duration: 250 })
    }
  }, [loading])

  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }))
  const sceneStyle = useAnimatedStyle(() => ({ opacity: sceneOpacity.value }))
  const motoStyle = useAnimatedStyle(() => {
    // In LTR: 0 → full width (left to right)
    // In RTL:  0 → negative full width (right to left)
    const travel = RTL ? 360 : -360
    return {
      transform: [{ translateX: motoProgress.value * travel + (RTL ? 360 - 32 : -32) }],
    }
  })

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress?.()
      }}
      style={!inactive ? glowShadow : undefined}
      className={`min-h-14 flex-row items-center justify-center overflow-hidden rounded-2xl bg-primary px-6 py-3${disabled && !loading ? " opacity-50" : ""}`}
    >
      {/* Static label */}
      <Animated.View style={labelStyle} className="absolute">
        <Text className="text-base font-medium tracking-wide text-primary-foreground">
          {label}
        </Text>
      </Animated.View>

      {/* Loading scene */}
      <Animated.View style={sceneStyle} className="absolute inset-0">
        {/* Road — dashed line near the bottom */}
        <View className="absolute bottom-3 left-4 right-4 flex-row justify-between">
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} className="h-0.5 w-5 rounded bg-primary-foreground/20" />
          ))}
        </View>

        {/* Items falling down into the motorcycle */}
        <FallingItem emoji="🥕" left="25%" delay={0} loading={!!loading} />
        <FallingItem emoji="🧅" left="45%" delay={DROP_CYCLE / 3} loading={!!loading} />
        <FallingItem emoji="🧄" left="65%" delay={(DROP_CYCLE / 3) * 2} loading={!!loading} />

        {/* Motorcycle */}
        <Animated.Text style={[motoStyle, { position: "absolute", bottom: 4, fontSize: 26 }]}>
          🛵
        </Animated.Text>
      </Animated.View>
    </Pressable>
  )
}

/**
 * An item that appears at the top of the button scene and falls straight down
 * toward the road, fading out as it goes. Loops with a staggered delay.
 */
function FallingItem({
  emoji,
  left,
  delay,
  loading,
}: {
  emoji: string
  left: DimensionValue
  delay: number
  loading: boolean
}) {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(0)

  useEffect(() => {
    if (loading) {
      // Appear at the top, fall to road level, then stay invisible for the pause.
      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: DROP_APPEAR }),   // pop in
            withTiming(0, { duration: DROP_FALL }),     // fade out while falling
            withTiming(0, { duration: DROP_PAUSE }),    // invisible pause
          ),
          -1,
          false,
        ),
      )
      translateY.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(0, { duration: DROP_APPEAR }),   // start near top
            withTiming(24, { duration: DROP_FALL }),    // fall toward road
            withTiming(0, { duration: DROP_PAUSE }),    // snap back while invisible
          ),
          -1,
          false,
        ),
      )
    } else {
      cancelAnimation(opacity)
      cancelAnimation(translateY)
      opacity.value = withTiming(0, { duration: 150 })
    }
  }, [loading])

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Animated.Text style={[style, { position: "absolute", top: 6, left, fontSize: 15 }]}>
      {emoji}
    </Animated.Text>
  )
}
