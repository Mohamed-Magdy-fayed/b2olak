---
description: One-shot ship — gate web+mobile, build a local APK, commit, and push (triggers Vercel + cloud release build)
---

# /ship

The single deploy command for this monorepo. Gates **both** apps, builds a fast local
Android APK for on-device testing, writes a real commit, and pushes — which automatically
deploys web to Vercel and fires the cloud release build (production AAB) via GitHub Actions.

Run the steps in strict sequence. **Abort with a clear message if any step fails — never
commit or push if a gate failed.** Optional arg: `/ship qa` (default) or `/ship prod`
selects which `EXPO_PUBLIC_API_URL` is baked into the local APK.

## 1. Gate (web + shared packages)

From the repo root, run and require each to pass:

```
npm run typecheck   # turbo — covers apps/web, apps/mobile, and all packages
npm run lint
npm run test        # Playwright logic project (~45s)
npm run build       # turbo build — web production build
```

`typecheck` already covers mobile (apps/mobile has a `typecheck` script). If any step
fails, stop, show only the relevant `file:line + message` lines, and ask before fixing.

## 2. Verify + build the mobile APK locally

This both **verifies** the mobile app compiles natively and produces an installable APK —
no EAS queue. Requires the local Android toolchain (`JAVA_HOME`, `ANDROID_HOME`); if it's
missing, tell the user to run the toolchain setup and skip to step 3 with a warning.

**Build through the short-path junction `C:\b2`, not the real OneDrive path.** React
Native's codegen mirrors the absolute source path inside the build dir, which blows past
Windows' 260-char limit from the deep `…\OneDrive\Desktop\apps\ba2olak` root (ninja fails
with `mkdir … No such file or directory`). `C:\b2` is a junction to the repo that keeps
paths short. Ensure it exists first (idempotent, no admin needed):

```powershell
if (-not (Test-Path C:\b2)) { New-Item -ItemType Junction -Path C:\b2 -Target "C:\Users\moham\OneDrive\Desktop\apps\ba2olak" }
```

Pick the API URL from the arg (mirrors `apps/mobile/eas.json`):
- `qa` (default) → `https://ba2olak-qa.gateling.com`
- `prod` → `https://ba2olak.gateling.com`

Then, in PowerShell, build from the junction:

```powershell
$env:EXPO_PUBLIC_API_URL = "https://ba2olak-qa.gateling.com"   # or the prod URL
Set-Location C:\b2\apps\mobile
npm run build:apk
```

`build:apk` runs `expo prebuild -p android` (regenerates the gitignored `android/`) then
`gradlew assembleRelease` for `arm64-v8a` only (fast; ~3 min warm). JVM memory for the KSP
step comes from `~/.gradle/gradle.properties` (heap 4g / metaspace 2g) — the Expo default
OOMs. On success the APK is at:

```
C:\b2\apps\mobile\android\app\build\outputs\apk\release\app-release.apk
```

If gradle fails with a stale Gradle home lock (`journal-1.lock`), run `gradlew --stop` and
kill stray `java` processes, then retry. For any real compile error, surface the failing
`> Task :…` line — do not commit.

## 3. Analyse the diff and write the commit

Run `git status` and `git diff HEAD`. Write a concise, accurate, imperative-mood message
(subject ≤72 chars; add a body only if multiple unrelated areas changed). No generic
"update files".

## 4. Stage and commit

Stage only files that belong to the change — **never** `.env`, secrets, `google-services.json`,
or build artifacts (`android/`, `ios/`, `dist/` are gitignored already). Commit with:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

## 5. Push

```
git push
```

Pushing `main` triggers two pipelines automatically:
- **Vercel** → web production deploy.
- **GitHub Actions** (`.github/workflows/mobile-android.yml`) → cloud **production AAB**
  (signed, store-ready, auto-incremented version). This needs the `EXPO_TOKEN` repo secret.

## Done — report

- Commit hash + the message used.
- Local APK path (step 2) so the user can install it on a device now.
- Reminder: watch the Vercel dashboard (web) and the GitHub Actions run (mobile AAB).
