import { type ReactNode } from "react"
import { View, type ViewStyle } from "react-native"
import Animated from "react-native-reanimated"
import {
  KeyboardAvoidingView,
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller"

import { useKeyboardBottomPadding } from "@/components/ui/keyboard-insets"
import { Screen } from "@/components/ui/screen"

/**
 * Keyboard-aware primitives for input screens.
 *
 * These wrap `react-native-keyboard-controller`, which correctly insets the
 * layout above the on-screen keyboard on Android edge-to-edge (where the bare
 * RN `KeyboardAvoidingView` is a no-op) and in production builds.
 *
 * Deliberately separate from `Screen`: `Screen` stays a plain container so
 * list/static screens (e.g. the search `FlatList`) keep working — only screens
 * with focused inputs opt into a scroll/avoiding wrapper.
 */

type KeyboardAwareScreenProps = {
  children: ReactNode
  /**
   * Pinned content above the scroll area — typically `ScreenHeader` /
   * `ScreenBackHeader`. Stays fixed while the body scrolls under the keyboard.
   */
  header?: ReactNode
  /**
   * Pinned footer CONTENT (e.g. the primary CTA). Rendered inside a
   * `ScreenFooter`, so it rides the keyboard and owns the bottom safe area —
   * callers pass children, not a pre-styled bar.
   */
  footer?: ReactNode
  /** Set when the tab bar is visible below this screen (it owns the inset). */
  insideTabs?: boolean
  /** Horizontal screen gutter (header + scroll body); defaults to off. */
  padded?: boolean
  /** Extra space kept between the focused input and the keyboard. */
  bottomOffset?: number
  contentContainerClassName?: string
  contentContainerStyle?: ViewStyle
}

/**
 * The single keyboard-aware scroll screen for input forms. Renders the shared
 * `Screen` canvas with an optional pinned `header`, a keyboard-aware scroll body
 * that lifts the focused field above the keyboard, and an optional pinned
 * `footer`. Every scrolling input screen routes through this so behaviour
 * (offset, tap handling, dismiss-on-drag) stays identical app-wide.
 *
 * The footer renders outside the padded region so its top border spans the
 * full width; `padded` only gutters the header and scroll body.
 */
export function KeyboardAwareScreen({
  children,
  header,
  footer,
  insideTabs = false,
  padded = false,
  bottomOffset = 24,
  contentContainerClassName,
  contentContainerStyle,
}: KeyboardAwareScreenProps) {
  return (
    <Screen padded={false}>
      {header ? <View className={padded ? "px-4" : undefined}>{header}</View> : null}
      <KeyboardAwareScrollView
        className={padded ? "flex-1 px-4" : "flex-1"}
        contentContainerClassName={contentContainerClassName}
        contentContainerStyle={contentContainerStyle}
        bottomOffset={bottomOffset}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets
      >
        {children}
      </KeyboardAwareScrollView>
      {footer ? <ScreenFooter insideTabs={insideTabs}>{footer}</ScreenFooter> : null}
    </Screen>
  )
}

/**
 * THE pinned screen footer. Place it as the last child of a `Screen` whose
 * scrollable content is `flex-1`. It sits flush on top of whatever owns the
 * bottom edge: the tab bar (`insideTabs`), the Android nav bar / home
 * indicator (via safe-area insets), or the open keyboard (it rides up with it
 * and its safe-area padding collapses — see `useKeyboardBottomPadding`).
 */
export function ScreenFooter({
  children,
  insideTabs = false,
  className,
}: {
  children: ReactNode
  insideTabs?: boolean
  className?: string
}) {
  const bottomPadding = useKeyboardBottomPadding({ insideTabs })
  return (
    <KeyboardStickyView>
      <View className={`border-t border-border bg-background ${className ?? ""}`}>
        {/* Padding lives on a core Animated.View so the animated bottom inset
            and the static chrome never fight NativeWind's className mapping. */}
        <Animated.View
          style={[{ paddingTop: 12, paddingHorizontal: 16, gap: 12 }, bottomPadding]}
        >
          {children}
        </Animated.View>
      </View>
    </KeyboardStickyView>
  )
}

/** Re-export for centered (non-scrolling) screens like the auth flow. */
export { KeyboardAvoidingView }
