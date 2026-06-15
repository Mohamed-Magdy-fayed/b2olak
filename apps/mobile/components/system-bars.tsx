import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";

/**
 * Android navigation bar styling.
 *
 * We keep the bar VISIBLE (no immersive hiding). Under edge-to-edge it is
 * transparent, so the charcoal window background shows through and the bar
 * blends into the app instead of reading as a separate black bar — the modern,
 * seamless look. Button contrast (light icons) comes from app.json's
 * `androidNavigationBar.barStyle`. We re-assert visibility on foreground because
 * returning from multitasking, the recents screen, or a permission dialog can
 * leave it in a transient immersive state. No-op on iOS and web.
 */
export function SystemBars() {
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const apply = () => void NavigationBar.setVisibilityAsync("visible");
    apply();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") apply();
    });
    return () => sub.remove();
  }, []);

  return null;
}
