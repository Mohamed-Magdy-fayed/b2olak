/**
 * ba2olak brand tokens — reference values for the design system.
 *
 * Neither app consumes this file at runtime:
 *   - Web uses OKLCH CSS variables in packages/ui/src/styles/globals.css
 *     (shadcn/ui theme, violet primary, light-mode-first).
 *   - Mobile defines its own NativeWind palette in apps/mobile/tailwind.config.js
 *     (dark-luxury: charcoal canvas, gold primary, deep-emerald accent).
 *
 * The two palettes are **intentionally different** — see docs/13-token-parity.md.
 * This file serves as a brand reference (naming, radius scale, spacing) and as
 * the starting point if a future unified token pipeline is built.
 */

export const palette = {
  violet: {
    DEFAULT: "#7c3aed",
    foreground: "#ffffff",
    soft: "#ede9fe",
  },
  lime: {
    DEFAULT: "#a3e635",
    foreground: "#1a2e05",
    soft: "#ecfccb",
  },
  ink: {
    DEFAULT: "#0a0a0f",
    soft: "#18181f",
  },
  paper: "#fafafa",
  destructive: "#ef4444",
  warning: "#f59e0b",
  success: "#10b981",
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const spacing = {
  screenPadding: 16,
  cardGap: 12,
} as const;

export const brand = {
  nameEn: "ba2olak",
  nameAr: "بقولك",
} as const;
