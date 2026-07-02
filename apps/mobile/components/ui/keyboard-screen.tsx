import { useEffect, useRef, type ReactNode } from "react"
import {
  Dimensions,
  ScrollView,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"

import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  useFooterBottomPadding,
  useKeyboardCoverage,
  useWindowKeyboard,
} from "@/components/ui/keyboard-insets"
import { Screen } from "@/components/ui/screen"

/**
 * Keyboard-aware primitives for MAIN-WINDOW input screens.
 *
 * Everything here reacts to RN core keyboard events (`useWindowKeyboard`) and
 * resizes real layout — no overlay/transform tricks, no
 * react-native-keyboard-controller (whose native pipeline is inert on this
 * app's main window; modals keep RNKC — see bottom-sheet.tsx).
 *
 * The model: screens are a flex column [header, scroll flex-1, footer]. When
 * the keyboard opens, the footer's bottom padding grows by the keyboard
 * height, which SHRINKS the scroll viewport — the screen genuinely resizes,
 * so all content stays reachable and pinned actions sit flush above the keys.
 */

type KeyboardAwareScreenProps = {
  children: ReactNode
  /**
   * Pinned content above the scroll area — typically `ScreenHeader` /
   * `ScreenBackHeader`. Stays fixed while the body scrolls.
   */
  header?: ReactNode
  /**
   * Pinned footer CONTENT (e.g. the primary CTA). Rendered inside a
   * `ScreenFooter`, so it sits flush above the keyboard / nav bar — callers
   * pass children, not a pre-styled bar.
   */
  footer?: ReactNode
  /** Set when the tab bar is visible below this screen (it owns the inset). */
  insideTabs?: boolean
  /** Horizontal screen gutter (header + scroll body); defaults to off. */
  padded?: boolean
  /** Extra space kept between the focused input and the keyboard/footer. */
  bottomOffset?: number
  contentContainerClassName?: string
  contentContainerStyle?: StyleProp<ViewStyle>
}

/**
 * The single keyboard-aware scroll screen for input forms: shared `Screen`
 * canvas, optional pinned header, a scroll body whose viewport shrinks above
 * the keyboard, and an optional pinned footer. When the keyboard opens with a
 * field focused, the body scrolls the field into the visible viewport.
 */
export function KeyboardAwareScreen({
  children,
  header,
  footer,
  insideTabs = false,
  padded = false,
  bottomOffset,
  contentContainerClassName,
  contentContainerStyle,
}: KeyboardAwareScreenProps) {
  const keyboard = useWindowKeyboard()
  const insets = useSafeAreaInsets()
  const scrollRef = useRef<ScrollView>(null)
  const scrollY = useRef(0)
  const clearance = bottomOffset ?? 24

  // When the keyboard opens over a focused field, scroll it into the (now
  // shrunken) viewport. Focus moves BETWEEN fields while the keyboard is up
  // are handled natively — the viewport is real layout, so Android's
  // focused-field-into-view behaviour targets the right area.
  useEffect(() => {
    if (!keyboard.visible) return
    const input = TextInput.State.currentlyFocusedInput()
    if (!input) return
    // Let the footer/viewport resize settle before measuring.
    const task = requestAnimationFrame(() => {
      input.measureInWindow((_x, y, _w, h) => {
        // Core events under-report the keyboard height by the nav-bar inset
        // on edge-to-edge — the real keyboard top sits that much higher.
        const keyboardTop =
          Dimensions.get("window").height - keyboard.height - insets.bottom
        const overlap = y + h + clearance - keyboardTop
        if (overlap > 0) {
          scrollRef.current?.scrollTo({
            y: scrollY.current + overlap,
            animated: true,
          })
        }
      })
    })
    return () => cancelAnimationFrame(task)
  }, [keyboard.visible, keyboard.height, insets.bottom, clearance])

  return (
    <Screen padded={false}>
      {header ? <View className={padded ? "px-4" : undefined}>{header}</View> : null}
      <ScrollView
        ref={scrollRef}
        className={padded ? "flex-1 px-4" : "flex-1"}
        contentContainerClassName={contentContainerClassName}
        contentContainerStyle={contentContainerStyle}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y
        }}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {footer ? (
        <ScreenFooter insideTabs={insideTabs}>{footer}</ScreenFooter>
      ) : (
        <KeyboardSpacer insideTabs={insideTabs} />
      )}
    </Screen>
  )
}

/**
 * THE pinned screen footer. Place it as the last child of a `Screen` whose
 * scrollable content is `flex-1`. Its bottom padding always reflects the
 * current owner of the bottom edge — tab bar, Android nav bar, or the open
 * keyboard — so the content sits flush above whichever is there (and growing
 * padding shrinks the sibling scroll area; see `useFooterBottomPadding`).
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
  const paddingBottom = useFooterBottomPadding({ insideTabs })
  return (
    <View
      className={`border-t border-border bg-background ${className ?? ""}`}
      style={{ paddingTop: 12, paddingHorizontal: 16, gap: 12, paddingBottom }}
    >
      {children}
    </View>
  )
}

/**
 * Invisible flex-column spacer that grows to the keyboard's coverage while it
 * is open (nav-bar inset correction and, on tab screens, the always-visible
 * tab bar's height are baked in — see `useKeyboardCoverage`). Place after a
 * `flex-1` scroll area on screens WITHOUT a pinned footer so the viewport
 * shrinks and content stays reachable above the keys.
 */
export function KeyboardSpacer({ insideTabs = false }: { insideTabs?: boolean }) {
  const coverage = useKeyboardCoverage({ insideTabs })
  return <View style={{ height: coverage }} />
}

/**
 * Drop-in replacement for the old RNKC `KeyboardAvoidingView` used by the
 * centered auth screens: pads its bottom by the keyboard coverage so `flex-1
 * justify-center` content re-centers in the remaining space. The `behavior`
 * prop is accepted for API compatibility and ignored — padding is the only
 * mode.
 */
export function KeyboardAvoidingView({
  children,
  className,
  style,
  behavior: _behavior,
}: {
  children: ReactNode
  className?: string
  style?: StyleProp<ViewStyle>
  behavior?: "padding" | "height" | "position"
}) {
  const coverage = useKeyboardCoverage()
  return (
    <View className={className} style={[style, { paddingBottom: coverage }]}>
      {children}
    </View>
  )
}
