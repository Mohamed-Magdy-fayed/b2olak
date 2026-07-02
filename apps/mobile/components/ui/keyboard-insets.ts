import { interpolate, useAnimatedStyle } from "react-native-reanimated"
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"

/**
 * The ONE place the app computes bottom padding for pinned bottom elements
 * (screen footers, sheet footers). The bottom edge is owned by exactly one
 * thing at a time, and the padding reflects it:
 *
 * - tab bar visible (`insideTabs`)      → small gap only (the bar owns the inset)
 * - no tab bar, keyboard closed         → `insets.bottom + gap` (Android nav bar /
 *                                         home indicator; 0 on inset-less devices)
 * - keyboard open                       → gap only — the keyboard covers the
 *                                         nav-bar area, so the safe-area padding
 *                                         collapses and content sits flush above
 *                                         the keys
 *
 * Returns an animated style; apply it to a reanimated `Animated.View`.
 */
export function useKeyboardBottomPadding({
  gap = 12,
  insideTabs = false,
}: {
  /** Breathing room kept in every state. */
  gap?: number
  /** The tab bar sits below this element and already covers the safe area. */
  insideTabs?: boolean
} = {}) {
  const insets = useSafeAreaInsets()
  const { progress } = useReanimatedKeyboardAnimation()
  const closed = insideTabs ? gap : insets.bottom + gap

  return useAnimatedStyle(() => ({
    paddingBottom: interpolate(progress.value, [0, 1], [closed, gap]),
  }))
}

/**
 * Static bottom padding for scroll content on screens WITHOUT a pinned footer
 * and WITHOUT a tab bar (pushed detail screens, terms/privacy): the last line
 * must clear the Android nav bar / home indicator instead of scrolling behind
 * it. Screens with a `ScreenFooter` don't need this — the footer owns the edge.
 */
export function useScreenBottomPadding(gap = 24) {
  const insets = useSafeAreaInsets()
  return insets.bottom + gap
}
