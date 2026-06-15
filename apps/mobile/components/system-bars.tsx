import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";

/**
 * Immersive Android navigation bar.
 *
 * Hides the bottom 3-button / gesture bar so the app fills the screen edge to
 * edge. Android keeps it reachable: a swipe from the bottom reveals it as a
 * transient overlay, then it auto-hides again (sticky-immersive behavior).
 *
 * We re-apply on foreground because returning from multitasking, the recents
 * screen, or a permission dialog can make the system bar visible again.
 *
 * No-op on iOS (the home indicator can't be hidden) and web.
 */
export function SystemBars() {
  useEffect(() => {
    if (Platform.OS !== "android") return;

    // `setVisibilityAsync` is deprecated in newer SDKs (replaced by
    // `setHidden`) but is the imperative API shipped with SDK 56. Hiding the
    // bar under edge-to-edge yields sticky-immersive behavior automatically:
    // a swipe from the bottom reveals it transiently, then it re-hides.
    const hide = () => void NavigationBar.setVisibilityAsync("hidden");
    hide();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") hide();
    });
    return () => sub.remove();
  }, []);

  return null;
}
