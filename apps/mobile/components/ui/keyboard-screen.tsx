import { type ReactNode } from "react"
import { View, type ViewStyle } from "react-native"
import {
  KeyboardAvoidingView,
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller"

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
  /** Horizontal screen gutter; defaults to the standard 20px. */
  padded?: boolean
  /** Extra space kept between the focused input and the keyboard. */
  bottomOffset?: number
  className?: string
  contentContainerClassName?: string
}

/**
 * Scrollable, keyboard-aware screen for forms. Renders the shared `Screen`
 * canvas, then a keyboard-aware scroll view that lifts the focused field above
 * the keyboard. Taps outside inputs stay responsive (`persistTaps`).
 */
export function KeyboardAwareScreen({
  children,
  padded = false,
  bottomOffset = 24,
  className,
  contentContainerClassName,
}: KeyboardAwareScreenProps) {
  return (
    <Screen padded={padded}>
      <KeyboardAwareScrollView
        bottomOffset={bottomOffset}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        className={className}
        contentContainerClassName={contentContainerClassName}
      >
        {children}
      </KeyboardAwareScrollView>
    </Screen>
  )
}

/**
 * Fixed footer (e.g. a primary CTA) that rises above the keyboard when it opens
 * and falls back to its normal position when it closes.
 */
export function KeyboardStickyFooter({
  children,
  offset,
  className,
  style,
}: {
  children: ReactNode
  offset?: { closed?: number; opened?: number }
  className?: string
  style?: ViewStyle
}) {
  return (
    <KeyboardStickyView offset={offset}>
      {/* Styling lives on a core View so NativeWind reliably maps className. */}
      <View className={className} style={style}>
        {children}
      </View>
    </KeyboardStickyView>
  )
}

/** Re-export for centered (non-scrolling) screens like the auth flow. */
export { KeyboardAvoidingView }
