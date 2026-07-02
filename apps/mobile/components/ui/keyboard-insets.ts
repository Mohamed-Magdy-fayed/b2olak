import { useEffect, useState } from "react"
import {
  Keyboard,
  LayoutAnimation,
  Platform,
  type KeyboardEvent,
} from "react-native"
import { interpolate, useAnimatedStyle } from "react-native-reanimated"
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useTabBarHeight } from "@/components/ui/tab-bar"

/**
 * Keyboard geometry from RN CORE events — the only keyboard signal used on the
 * app's MAIN window.
 *
 * Why not react-native-keyboard-controller here: on this app's main window
 * RNKC's insets-animation callbacks never fire (verified on device — sticky
 * footers, keyboard-aware scrolls and avoiding views were all inert, while
 * the tab bar, driven by core events, hid correctly). Inside RN `Modal`
 * windows RNKC works fine (each sheet nests its own provider), so modals keep
 * it — see bottom-sheet.tsx. Main-window layout instead resizes with plain
 * padding driven by these core events: deterministic, no native pipeline to
 * break.
 */
export function useWindowKeyboard(): { visible: boolean; height: number } {
  const [keyboard, setKeyboard] = useState({ visible: false, height: 0 })

  useEffect(() => {
    // Android only emits the `Did` variants; iOS `Will` keeps it in sync with
    // the keyboard animation.
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide"

    const animate = () => {
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      } catch {
        // Layout still lands correctly without the animation.
      }
    }
    const show = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      animate()
      setKeyboard({ visible: true, height: e.endCoordinates.height })
    })
    const hide = Keyboard.addListener(hideEvent, () => {
      animate()
      setKeyboard({ visible: false, height: 0 })
    })
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  return keyboard
}

/**
 * How much of THIS screen's layout container the open keyboard covers — the
 * number every main-window spacer/footer pads by. 0 while the keyboard is
 * closed.
 *
 * Two corrections over the raw event height:
 * - On Android edge-to-edge, the core event under-reports the keyboard height
 *   by the nav-bar inset (verified on device: content stayed hidden by exactly
 *   the 3-button bar's 48dp) — so the real covered region is
 *   `height + insets.bottom`.
 * - On tab screens (`insideTabs`) the bar stays visible (hide-on-keyboard
 *   flickers) and the screen container ends ABOVE it, so the bar's own height
 *   comes off the overlap.
 */
export function useKeyboardCoverage({
  insideTabs = false,
}: { insideTabs?: boolean } = {}): number {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useTabBarHeight()
  const keyboard = useWindowKeyboard()
  if (!keyboard.visible) return 0
  const covered = keyboard.height + insets.bottom
  return Math.max(covered - (insideTabs ? tabBarHeight : 0), 0)
}

/**
 * Bottom padding for MAIN-WINDOW pinned footers, from core keyboard events.
 * The bottom edge is owned by exactly one thing at a time:
 *
 * - keyboard open                  → keyboard coverage + gap (content flush
 *                                    above the keys)
 * - tab bar visible (`insideTabs`) → small gap only (the bar owns the inset)
 * - otherwise                      → `insets.bottom + gap` (Android nav bar /
 *                                    home indicator; 0 on inset-less devices)
 *
 * Because the footer is in normal flow at the bottom of a flex column, growing
 * its padding SHRINKS the sibling scroll area — the screen genuinely resizes,
 * so everything stays reachable by scrolling and Android's own
 * focused-field-into-view behaviour works with it.
 */
export function useFooterBottomPadding({
  gap = 12,
  insideTabs = false,
}: {
  gap?: number
  insideTabs?: boolean
} = {}): number {
  const insets = useSafeAreaInsets()
  const coverage = useKeyboardCoverage({ insideTabs })
  if (coverage > 0) return coverage + gap
  return insideTabs ? gap : insets.bottom + gap
}

/**
 * MODAL-ONLY twin of `useFooterBottomPadding`, driven by RNKC's reanimated
 * keyboard values (which work inside RN `Modal` windows). Used by the sheet
 * primitives in bottom-sheet.tsx — do NOT use on main-window screens.
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
