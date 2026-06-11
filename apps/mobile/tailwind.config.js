/**
 * NativeWind (Tailwind v3) config.
 * Color values mirror packages/theme/src/tokens.ts — the documented source of
 * truth shared with the web app's CSS variables.
 */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#7c3aed", foreground: "#ffffff" },
        accent: { DEFAULT: "#a3e635", foreground: "#1a2e05" },
        background: "#fafafa",
        foreground: "#0a0a0f",
        card: "#ffffff",
        muted: { DEFAULT: "#f4f4f5", foreground: "#71717a" },
        border: "#e4e4e7",
        input: "#e4e4e7",
        destructive: "#ef4444",
        success: "#10b981",
        warning: "#f59e0b",
      },
      borderRadius: {
        lg: "16px",
        xl: "24px",
      },
    },
  },
  plugins: [],
};
