/**
 * NativeWind (Tailwind v3) config.
 *
 * Dark-luxury palette for the ba2olak mobile app — intentionally divergent from
 * the web app's CSS variables (packages/theme/src/tokens.ts). The mobile
 * storefront targets a premium audience: charcoal canvas, warm off-white text,
 * gold accent, deep-emerald secondary.
 */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#C9A227", foreground: "#0E0E10" }, // gold / dark text
        accent: { DEFAULT: "#2F6F4E", foreground: "#F5F2EC" }, // deep emerald
        background: "#0E0E10", // charcoal canvas
        foreground: "#F5F2EC", // warm off-white
        card: "#161619", // base surface
        elevated: "#1E1E22", // raised surface / inputs
        muted: { DEFAULT: "#1C1C20", foreground: "#9B968C" },
        border: "#2A2A2E",
        input: "#26262B",
        destructive: "#F0584F",
        success: "#34D399",
        warning: "#E5A33D",
      },
      borderRadius: {
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
      },
      fontFamily: {
        sans: ["Tajawal_400Regular"],
        display: ["ElMessiri_700Bold"],
      },
    },
  },
  plugins: [],
};
