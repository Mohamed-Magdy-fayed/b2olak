import type { LanguageMessages } from "../lib";

/**
 * English dictionary. RULE: every key added here MUST be added to ar.ts in the
 * same change — the shared Dictionary type enforces it at typecheck time.
 */
const en = {
  common: {
    appName: "ba2olak",
    language: "Language",
    loading: "Loading…",
    retry: "Retry",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
  },
  home: {
    tagline: "You want it. We buy it. We deliver it.",
    subtitle: "Groceries and market runs, straight to your door.",
    apiStatus: "API status",
    apiOk: "Connected",
    apiChecking: "Checking…",
    apiError: "Unavailable",
    phaseBanner: "Phase 2 — monorepo foundation is live.",
  },
} satisfies LanguageMessages;

export default en;
export type Dictionary = typeof en;
