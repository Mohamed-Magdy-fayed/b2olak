import { Platform, type ViewStyle } from "react-native";

/**
 * Shared, platform-aware shadow presets for the dark-luxury theme.
 *
 * NativeWind's shadow utilities are unreliable across RN platforms, so depth is
 * applied through `style` props using these presets. On a charcoal canvas a soft
 * black drop creates surface separation; the gold "glow" gives CTAs presence.
 */

export const cardShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  android: { elevation: 6 },
  default: {},
}) as ViewStyle;

/** Subtle gold glow for primary CTAs. */
export const glowShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: "#C9A227",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
  },
  android: { elevation: 8 },
  default: {},
}) as ViewStyle;
