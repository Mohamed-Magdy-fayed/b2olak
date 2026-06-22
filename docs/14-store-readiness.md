# Store Submission Readiness — ba2olak

Covers **Google Play** and **Apple App Store** requirements as of June 2026.
Audited against the live codebase and current store policies.

**Legend:** ✅ done · ⚠️ gap (needs work) · 📋 manual (console step, not code)

---

## Critical blockers

These must be resolved before submission to **either** store.

| # | Issue | Details |
|---|-------|---------|
| 1 | **No in-app account deletion** | Both Google Play and App Store require an in-app deletion flow for any app that allows account creation. ba2olak's account screen only has "Sign Out". The privacy policy already *claims* deletion is available ("Delete your account from the Account screen") — so this is both a policy violation and a broken promise. **Must implement.** |
| 2 | **No `deleteAccount` API endpoint** | `packages/api/src/routers/auth.ts` has no deletion procedure. The implementation needs both the tRPC endpoint (anonymize PII, retain order records for accounting per the privacy policy) and the mobile UI button in `apps/mobile/app/(customer)/account.tsx`. |

---

## Google Play checklist

### A. Account deletion (Play policy — enforced)

| Item | Status | Notes |
|------|--------|-------|
| In-app account deletion option | ⚠️ | Must be in the app itself (see blocker #1) |
| Web URL for account deletion | ⚠️ | Play Console Data Safety form requires a public URL where users can request deletion — e.g. `https://ba2olak.gateling.com/delete-account` or a WhatsApp link with a pre-filled message |
| Data deletion scope documented | ⚠️ | Specify what gets deleted vs. retained (PII anonymized, order records kept — already described in privacy policy, just needs the endpoint) |

### B. Data Safety form (Play Console — manual)

📋 Fill out in Play Console → App content → Data safety. Declare:

| Data type | Collected? | Shared? | Notes |
|-----------|-----------|---------|-------|
| Name | Yes | No | Profile name, customer-visible to driver during delivery |
| Phone number | Yes | No | Primary auth identifier |
| Precise location | No | — | App never requests location permission |
| Approximate location | No | — | — |
| Push token (device ID) | Yes | No | FCM token for order notifications; stored server-side |
| Order history / purchase history | Yes | No | Retained for accounting after account deletion |
| In-app messages / analytics | Yes (minimal) | No | Only `begin_checkout` event via internal API — no third-party SDK |

**Data security answers:**
- Data is encrypted in transit: Yes (HTTPS/TLS)
- Data encrypted at rest: Yes (Neon Postgres)
- Users can request deletion: **No** until blocker #1 is fixed — answer must be **Yes** to pass review

### C. Build config

| Item | Status | Notes |
|------|--------|-------|
| Package name | ✅ | `com.gatelingsolutions.ba2olak` |
| Version / build number | ✅ | `autoIncrement: true` in `eas.json` production profile |
| Adaptive icon (foreground + background + monochrome) | ✅ | All three assets declared in `app.json` |
| `google-services.json` | ✅ | Injected via EAS secret |
| Build type | ⚠️ | `eas.json` production sets `"buildType": "apk"`. Google Play **prefers AAB** (Android App Bundle) for smaller download size and required for new apps on Play. Switch to `"buildType": "aab"`. |
| Target SDK | ✅ | Expo SDK 56 targets Android 14 (API 34) — meets Play's current minimum |
| `softwareKeyboardLayoutMode: pan` | ✅ | Declared |
| `predictiveBackGestureEnabled: false` | ✅ | Opt-out is fine for now; revisit before SDK 57 |

### D. Store listing (manual)

📋 In Play Console → Store listing:

- [ ] Short description (80 chars)
- [ ] Full description (4 000 chars)
- [ ] Screenshots — phone: at least 2, each 16:9 or 9:16
- [ ] Feature graphic (1024 × 500 px)
- [ ] Content rating questionnaire — expected result: **Everyone** (no violence, no user-generated content visible to others, no location sharing)
- [ ] Privacy policy URL: `https://ba2olak.gateling.com/privacy`

---

## Apple App Store checklist

### A. Account deletion (App Store policy — enforced since 2022)

| Item | Status | Notes |
|------|--------|-------|
| In-app account deletion flow | ⚠️ | Same as Google Play blocker #1. Apple requires the option to be **within the app**, not just a web link or support contact. |
| Data deletion scope | ⚠️ | Disclose in App Privacy what happens to data after deletion |

### B. App Privacy (App Store Connect — manual)

📋 In App Store Connect → App Privacy. Declare:

| Data type | Collected | Linked to identity | Used for tracking |
|-----------|-----------|-------------------|-------------------|
| Name | Yes | Yes | No |
| Phone number | Yes | Yes | No |
| Purchase history | Yes | Yes | No |
| Product interaction (begin_checkout) | Yes | Yes | No |
| Device ID (push token) | Yes | Yes | No |
| Crash data | No (no crash SDK) | — | — |

**ATT (App Tracking Transparency):** Not required. ba2olak does not collect IDFA, does not use third-party analytics SDKs, and does not do cross-app tracking. No ATT prompt needed.

### C. Build config

| Item | Status | Notes |
|------|--------|-------|
| Bundle identifier | ✅ | `com.gatelingsolutions.ba2olak` |
| `ITSAppUsesNonExemptEncryption: false` | ✅ | Declared in `infoPlist` — no EAR export compliance needed |
| `supportsTablet: false` | ✅ | iPhone-only |
| Face ID permission string | ✅ | "Allow $(PRODUCT_NAME) to use Face ID to unlock the app." |
| Push notification entitlement | ✅ | Via `expo-notifications` plugin |
| Splash screen | ⚠️ | `app.json` has no `splash` block — only `splash-icon.png` exists as an asset. Expo SDK 56 requires an explicit `expo-splash-screen` plugin config or the default white splash will show. Add splash config or verify the default is acceptable. |
| Icons — 1024 × 1024 no alpha | ✅ | `icon.png` used by EAS (verify it has no alpha channel — App Store rejects icons with transparency) |

### D. Store listing (manual)

📋 In App Store Connect → App Information + Pricing + App Review:

- [ ] App name (30 chars)
- [ ] Subtitle (30 chars)
- [ ] Keywords (100 chars)
- [ ] Description
- [ ] Screenshots — iPhone 6.9" (required), iPhone 6.5", iPad (if targeting)
- [ ] Privacy policy URL: `https://ba2olak.gateling.com/privacy`
- [ ] Support URL
- [ ] Review notes (mention WhatsApp OTP login — reviewers need a test account)
- [ ] Content rating: **4+** expected

---

## Shared gaps (both stores)

| Gap | Action |
|-----|--------|
| Privacy policy & terms not linked in-app | Add links to `/privacy` and `/terms` on the account screen or sign-in screen. Both stores expect users to be able to access these from within the app. |
| No crash reporting | Consider adding `expo-updates` error boundaries or Sentry. Not a submission blocker, but App Review sometimes rejects apps that crash during review. |

---

## Implementation plan for code gaps

Priority order:

1. **`deleteAccount` tRPC endpoint** (blocker — both stores)
   - Anonymize: set `name = 'Deleted User'`, `phone = null` (or hashed), clear sessions, revoke devices/passkeys, clear push tokens
   - Retain: order rows (for accounting, as stated in privacy policy)
   - Procedure tier: `protectedProcedure` (any authenticated customer or driver)

2. **Delete account UI** in `apps/mobile/app/(customer)/account.tsx`
   - Destructive button at the bottom (red, requires confirmation sheet)
   - i18n keys in both `en.ts` and `ar.ts`

3. **Web deletion URL** (for Google Play Data Safety form)
   - Can be as simple as a `/delete-account` page that shows a WhatsApp link + instructions, or a form that fires the same tRPC endpoint via the web session

4. **Privacy policy + terms links in-app** (both stores)

5. **Android build type: APK → AAB** in `eas.json`

6. **Splash screen config** in `app.json` (iOS submission)

---

## Manual console steps (not Claude's job)

These require store console access and are the developer's responsibility:

- [ ] Google Play Console: create app, fill Data Safety form, upload AAB, run content rating questionnaire, set privacy policy URL
- [ ] App Store Connect: create app record, fill App Privacy, upload build via EAS `eas submit`, complete export compliance, submit for review
- [ ] EAS Submit config: fill out `submit.production` in `eas.json` with store credentials

---

*Audited 2026-06-21. Re-run after implementing account deletion and before each store submission.*
