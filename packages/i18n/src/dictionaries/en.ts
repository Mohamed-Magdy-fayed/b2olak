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
    phaseBanner: "Phase 3 — auth is live: sessions, WhatsApp OTP, admin sign-in.",
  },
  auth: {
    signInTitle: "Admin sign-in",
    signInSubtitle: "ba2olak operations dashboard",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signingIn: "Signing in…",
    signOut: "Sign out",
    signedInAs: "Signed in as {name} ({role})",
    invalidCredentials: "Wrong email or password.",
    suspended: "This account is suspended. Contact support.",
    otpInvalid: "Incorrect code. Try again.",
    otpExpired: "This code expired. Request a new one.",
    otpTooManyAttempts: "Too many attempts. Request a new code.",
    driverNotApproved: "Your driver account is pending review.",
  },
  validation: {
    phoneInvalid: "Enter a valid Egyptian mobile number.",
    otpInvalid: "The code is 6 digits.",
    emailInvalid: "Enter a valid email address.",
    passwordTooShort: "Password must be at least 8 characters.",
  },
  errors: {
    tooManyRequests: "Too many attempts. Slow down and try again later.",
    unknown: "Something went wrong. Please try again.",
  },
} as const satisfies LanguageMessages;

export default en;

/**
 * Same key structure as en, values free (ar provides its own strings).
 * `as const` keeps string literals narrow so t() can type placeholder params.
 */
type Mirror<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : Mirror<T[K]>;
};
export type Dictionary = Mirror<typeof en>;
