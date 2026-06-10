/**
 * ba2olak design tokens — the single source of truth shared by web (mapped to
 * CSS variables in globals.css) and mobile (mapped in NativeWind's
 * tailwind.config). Gen-Z direction: electric violet + lime pop on near-black,
 * generous radii. Values are raw so both Tailwind 4 (web) and NativeWind
 * (Tailwind 3.4) can consume them.
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
