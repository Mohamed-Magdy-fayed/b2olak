import { type ReactNode } from "react"
import { View, type ViewStyle } from "react-native"

/**
 * Pinned footer for a screen's primary action(s). Non-keyboard sibling of
 * `KeyboardStickyFooter`.
 *
 * Place it as the LAST child of a `Screen` whose scrollable content
 * (`ScrollView`/`FlatList`) is `flex-1`, so the bar stays fixed at the bottom
 * while content scrolls.
 *
 * The parent `Screen` already owns the bottom safe-area inset, and the
 * (in-flow) tab bar reserves its own space below the screen — so the bar only
 * adds a small breathing gap here, never the tab bar height. Horizontal padding
 * is left to the parent `Screen` (its standard `px-4` gutter) so the top border
 * sits inset like the rest of the screen content.
 */
export function BottomActionBar({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: ViewStyle
}) {
  return (
    <View
      className={`gap-3 border-t border-border bg-background pb-3 pt-3 ${className ?? ""}`}
      style={style}
    >
      {children}
    </View>
  )
}
