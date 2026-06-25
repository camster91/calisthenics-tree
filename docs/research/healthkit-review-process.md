# App Store Review Process for HealthKit Apps (Research, June 2026)

## What triggers a longer review

There is **no separate Apple-published "HealthKit questionnaire"** distinct from
Guideline 5.1.1. The "health-data review" is the standard App Review process
checking compliance with App Store Review Guidelines **5.1.1 (Privacy – Data
Collection and Storage, subclauses i–ix)**, plus extra scrutiny under
**1.4.1 (Medical apps "may be reviewed with greater scrutiny")** and
**2.5.1 (must clearly indicate HealthKit integration)**. The companion
artefact is the **App Privacy ("Nutrition Label") questionnaire** in App Store
Connect under *App Privacy*, where you must declare "Health & Fitness → Health"
data types if you read or write any HealthKit samples.

## Paperwork the developer submits

- **Xcode project:** HealthKit capability enabled; entitlement
  `com.apple.developer.healthkit` (and `…healthkit.clinicalrecords` if applicable).
- **Info.plist (iOS app AND watchOS extension):** `NSHealthShareUsageDescription`
  and `NSHealthUpdateUsageDescription`.
- **App Store Connect → App Information:** Privacy Policy URL (live HTTPS, also
  linked in-app).
- **App Store Connect → App Privacy:** declare all HealthKit data types
  collected (HealthKit API, Movement, Clinical Health Records, etc.) and whether
  data is linked to user identity.
- **App Store Connect → App Review Information:** contact, demo-account
  credentials, and **Reviewer Notes** explaining the HealthKit permission flow,
  which sample accounts have seeded workout data, and how to trigger read/write.
- **Primary category:** "Health & Fitness" for a calisthenics app (Apple's
  categories page: "Apps related to healthy living, including stress
  management…"). As of EU 2026 rules, primary/secondary Health & Fitness or
  Medical category triggers a regulated-medical-device status declaration.

## Expected timeline

Apple's published numbers (developer.apple.com/forums/thread/131256): **50% of
apps reviewed within 24 hours, 90% within 48 hours.** There is no documented
fixed 24–48h penalty specifically for HealthKit. Real-world reports
(Reddit r/iosapps June 2026; r/iOSProgramming threads 2024–2025) show
HealthKit first submissions commonly take 3–7 days; updates with no guideline
changes return to 24–48h. Plan for 3–5 days, request an expedited review only
for genuine time-critical releases (Apple rarely grants them for first apps).

## Common rejection causes (with 2024–2026 cases)

- **Guideline 2.5.1** — missing HealthKit disclosure (Stack Overflow 39716868,
  63261448; r/iOSProgramming Jan 2025 thread): "Your app uses HealthKit or
  CareKit APIs but does not indicate integration with the Health app."
- **Guideline 5.1.1(i)** — privacy policy URL missing or broken/non-HTTPS.
- **Guideline 5.1.1(ii)** — writing inaccurate data into HealthKit, or storing
  personal health data in iCloud.
- **Guideline 5.1.1(iv)** — using HealthKit data for advertising/marketing/data
  mining (explicitly forbidden), or for purposes unrelated to health/fitness.
- **Guideline 1.4.1** — claiming diagnostic/measurement capability without FDA
  clearance or EU MDR equivalent. Apple now displays FDA status on the App
  Store product page for Health & Fitness/Medical apps (March 2026).
- **Missing Info.plist strings** — crash on first HealthKit call → rejected
  under 2.1.
- **Watch extension missing the keys** — watchOS bundle needs its own
  `NSHealthShareUsageDescription` / `NSHealthUpdateUsageDescription`.
- **Vague permission strings** — generic boilerplate strings are rejected;
  must state what data and why.

## Info.plist requirements (Apple's expectations)

- `NSHealthShareUsageDescription` — required whenever you call any HealthKit
  read API. String must be honest, app-specific, and list the data + purpose.
  Example for a calisthenics app: *"Calisteniapp reads your workout history,
  body mass, and active energy from Apple Health to track your calisthenics
  progress and personal records."*
- `NSHealthUpdateUsageDescription` — required whenever you write samples
  (`HKWorkout`, body mass, etc.). Example: *"Calisteniapp writes completed
  bodyweight workouts and active energy to Apple Health so they appear in the
  Fitness app and contribute to your activity rings."*
- Place both keys in **both** the iOS app target and the watchOS extension
  target. Strings must be human-readable; the system shows them verbatim in
  the iOS Health permission sheet.