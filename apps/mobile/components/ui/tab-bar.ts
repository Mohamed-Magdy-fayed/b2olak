import type { ComponentProps } from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { Tabs } from "expo-router"

// expo-router vendors @react-navigation/bottom-tabs, so the options type is
// only reachable through the Tabs component's props.
type TabsScreenOptions = ComponentProps<typeof Tabs>["screenOptions"]

export const TAB_GOLD = "#C9A227"
export const TAB_MUTED = "#9B968C"

// Content height of the bar; the safe-area inset is added below it so the bar
// pins to the physical bottom edge and its background fills the nav-bar /
// home-indicator area.
const TAB_BAR_CONTENT_HEIGHT = 56
// Breathing room below the tab label so it doesn't hug the bottom edge on
// devices without a bottom inset (where insets.bottom is 0).
const TAB_BAR_GAP = 8

// Full-screen pushed detail views hide the tab bar entirely. `href: null` only
// removes a screen's tab *button* — the bar stays mounted behind the screen and
// peeks out below pinned footers unless it's display:none.
export const HIDDEN_TAB_BAR = { display: "none" } as const

/**
 * Shared tab-bar options for both role layouts (customer + driver), so the
 * bottom edge behaves identically everywhere: bar covers the safe area when
 * visible, and hides while the keyboard is open so pinned footers can sit
 * flush on the keys.
 */
export function useTabBarScreenOptions(): TabsScreenOptions {
  const insets = useSafeAreaInsets()
  return {
    headerShown: false,
    tabBarActiveTintColor: TAB_GOLD,
    tabBarInactiveTintColor: TAB_MUTED,
    tabBarHideOnKeyboard: true,
    tabBarLabelStyle: { fontWeight: "600", fontSize: 11 },
    tabBarStyle: {
      backgroundColor: "#161619",
      borderTopColor: "#2A2A2E",
      borderTopWidth: 1,
      height: TAB_BAR_CONTENT_HEIGHT + insets.bottom + TAB_BAR_GAP,
      paddingBottom: insets.bottom + TAB_BAR_GAP,
      paddingTop: 6,
    },
    tabBarBadgeStyle: { backgroundColor: TAB_GOLD, color: "#0E0E10" },
  }
}
