import { cloneElement } from "react";
import { Text, TextInput } from "react-native";
import {
  ElMessiri_600SemiBold,
  ElMessiri_700Bold,
} from "@expo-google-fonts/el-messiri";
import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
} from "@expo-google-fonts/tajawal";

/**
 * Premium Arabic + Latin typography for the dark-luxury theme.
 *
 * Body/UI: Tajawal (clean, geometric). Display/headings: El Messiri (elegant).
 * The registered family name equals the export identifier, e.g.
 * "Tajawal_400Regular" — these names are referenced by tailwind's fontFamily
 * (`font-sans`, `font-display`) and by the default-font patch below.
 */
export const appFonts = {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  ElMessiri_600SemiBold,
  ElMessiri_700Bold,
};

let patched = false;

/**
 * Make Tajawal the default family for every <Text>/<TextInput> without having to
 * touch each call site. The instance's own style is applied last, so any element
 * that sets its own fontFamily (e.g. `font-display` headings) still wins, while
 * fontWeight utilities continue to apply on top.
 */
export function setDefaultFont(family = "Tajawal_400Regular") {
  if (patched) return;
  patched = true;
  for (const Component of [Text, TextInput] as unknown as Array<{
    render?: (...args: unknown[]) => React.ReactElement<{ style?: unknown }>;
  }>) {
    const original = Component.render;
    if (typeof original !== "function") continue;
    Component.render = function patchedRender(...args: unknown[]) {
      const element = original.apply(this, args);
      return cloneElement(element, {
        style: [{ fontFamily: family }, element.props.style],
      });
    };
  }
}

// Run before the first render so the default family is in place app-wide.
setDefaultFont();
