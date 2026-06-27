import { useState, type ReactNode } from "react"
import { View, type LayoutChangeEvent, type ViewStyle } from "react-native"
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
  /**
   * Pinned content above the scroll area — typically `ScreenHeader` /
   * `ScreenBackHeader`. Stays fixed while the body scrolls under the keyboard.
   */
  header?: ReactNode
  /**
   * Pinned content below the scroll area — typically a `KeyboardStickyFooter`
   * with the primary CTA. Rendered full-bleed so its top border spans the edge.
   */
  footer?: ReactNode
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
 * The footer renders outside the padded region so a sticky-footer border spans
 * the full width; `padded` only gutters the header and scroll body.
 */
export function KeyboardAwareScreen({
  children,
  header,
  footer,
  padded = false,
  bottomOffset = 24,
  contentContainerClassName,
  contentContainerStyle,
}: KeyboardAwareScreenProps) {
  // The sticky footer is a sibling of the scroll view, so the keyboard-aware
  // scroll has no idea it exists: it would lift a focused field to `bottomOffset`
  // above the keyboard — straight behind the footer, which rises to sit on the
  // keyboard. Measure the footer and add its height to the offset so the focused
  // field clears it. Footers without inputs below them (no footer) keep the base
  // offset.
  const [footerHeight, setFooterHeight] = useState(0)
  const onFooterLayout = (e: LayoutChangeEvent) => {
    setFooterHeight(e.nativeEvent.layout.height)
  }

  return (
    <Screen padded={false}>
      {header ? <View className={padded ? "px-4" : undefined}>{header}</View> : null}
      <KeyboardAwareScrollView
        className={padded ? "flex-1 px-4" : "flex-1"}
        contentContainerClassName={contentContainerClassName}
        contentContainerStyle={contentContainerStyle}
        bottomOffset={bottomOffset + footerHeight}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets
      >
        {children}
      </KeyboardAwareScrollView>
      {footer ? <KeyboardStickyView onLayout={onFooterLayout}>{footer}</KeyboardStickyView> : null}
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
