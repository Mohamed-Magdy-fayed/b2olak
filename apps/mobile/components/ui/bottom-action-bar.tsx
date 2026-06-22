import { type ReactNode } from "react"
import { View, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

/**
 * Pinned footer for a screen's primary action(s). Non-keyboard sibling of
 * `KeyboardStickyFooter`.
 *
 * Place it as the LAST child of a `Screen` whose scrollable content
 * (`ScrollView`/`FlatList`) is `flex-1`, so the bar stays fixed at the bottom
 * while content scrolls. It clears the home-indicator safe area; on tab screens
 * pass `tabBarHeight` (from `useTabBarHeight()`) so it also clears the tab bar.
 *
 * Horizontal padding is left to the parent `Screen` (its standard `px-5`
 * gutter), so the top border sits inset like the rest of the screen content.
 */
export function BottomActionBar({
  children,
  tabBarHeight,
  className,
  style,
}: {
  children: ReactNode
  /** Pass on tab screens; omitted → uses the bottom safe-area inset. */
  tabBarHeight?: number
  className?: string
  style?: ViewStyle
}) {
  const insets = useSafeAreaInsets()
  return (
    <View
      className={`gap-3 border-t border-border bg-background pt-3 ${className ?? ""}`}
      style={[{ paddingBottom: (tabBarHeight ?? insets.bottom) + 12 }, style]}
    >
      {children}
    </View>
  )
}
