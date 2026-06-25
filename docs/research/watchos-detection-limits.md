# watchOS Detection Limits for "Auto-Log Calisthenics Set" Features

**Question:** Can Apple Watch detect a front-lever hold and prompt "Log 12s set?" without the user first starting a session?
**Bottom line up front:** No. v1 must be tap-to-start with smart auto-segmentation, not zero-input auto-detection.

## 1. Sensors exposed to third-party apps

watchOS exposes the full IMU stack via `CMMotionManager` (accelerometer, gyroscope, magnetometer, device-motion ~50 Hz), `CMAltimeter` (barometric), and `CMMotionActivityManager` (Apple's motion-coprocessor-fused 5-class activity: stationary / walking / running / cycling / automotive). Heart rate is read-only through HealthKit `HKQuantityTypeIdentifierHeartRate` / `HKLiveWorkoutBuilder`. watchOS 10 introduced `CMBatchedSensorManager` — up to 800 Hz accelerometer and 200 Hz device motion — *but Apple's WWDC23 "What's new in Core Motion" explicitly requires an active HealthKit workout session to use it* ("Because this is a workout-centric API, you need to have an active HealthKit workout session to get data"). Outside an active session, third-party access to high-frequency IMU is gated and rate-limited.

## 2. Exercise-type classification state-of-the-art

Apple's own auto-detection supports only **walking, running, swimming, elliptical, rowing** — confirmed in Apple Support and watchOS 5 community docs. No first-party API classifies calisthenics moves. Academic IMU studies (e.g., *Smart Health* 2025, "Predicting the types of physical activities using Apple Watch data"; PMC6387025 on complex physical exercises) report 80–95 % accuracy only for gross categories (sit/walk/run) on small cohorts, and explicitly note the Apple Watch "distinguishes between moving, exercising, and standing" — not between exercise types. Front-lever vs planche vs handstand vs L-sit requires a research-grade calisthenics-specific ML model. No public labelled dataset exists; a serious attempt would need 6–12 months of collection with multiple athletes, varied grips, and grip-strength wrist artefacts. Garage apps like Gymatic, AutoWorkout, and Motra market auto-detection but their watch UX is "press start, then we count reps" — they do not claim to detect exercise start without a session.

## 3. Detecting "workout ongoing" without user input

`CMMotionActivityManager` delivers updates only when the motion-coprocessor's classifier recognises a coarse activity class. It will not fire on a static hold. Continuous accelerometer streaming without an active workout session consumes background-budget and is not guaranteed to remain running. `HKLiveWorkoutBuilder` itself must be started from an active `HKWorkoutSession` — there is no "auto-start from motion" hook Apple documents. Practical workaround: an `WKExtendedRuntimeSession` plus motion-coprocessor activity start *can* wake a third-party app when the user begins walking or running, but again, the activity classifier only knows walking/running/cycling/automotive — not static holds.

## 4. Realistic third-party implementation pattern

Look at Slopes (skiing), Zones (cycling), Strong / Hevy / Gymatic (strength), and Strava. Every one of them — without exception — requires the user to tap Start on the Watch app (or accept an Apple-generated "Start Outdoor Walk?" reminder, which is itself a coarse motion-trigger not exercise-specific). Apple Watch reminders ("Start Workout Reminder", Settings > Workout) are the *only* first-party auto-prompt, and they are limited to the five activity types above. No shipping third-party app documents a "front lever auto-detected" prompt. Standard pattern: user taps Start → app opens `HKLiveWorkoutBuilder` → streams `CMBatchedSensorManager` → rep counters / hold timers update live → user taps End. The "auto-detect" layer, where present (Slopes smart-recording on iOS 26, Motra), still requires a session and only auto-labels reps within it.

## 5. Battery cost

Apple's own Workout Low Power Mode documentation shows continuous GPS + HR + motion during workouts reduces Apple Watch Ultra battery from ~36 h to ~12–20 h depending on model and settings. Background `CMMotionManager` updates without a workout entitlement are throttled and not guaranteed; within a workout, `CMBatchedSensorManager` adds further load. Macworld benchmarks show continuous HR + motion can cut daily life by ~30–50 %. Sustained always-on motion classification on the Watch would meaningfully drain the battery — making a "always-listening" architecture impractical.

## 6. Feasibility verdict

**Option (c): basically impossible in v1, without user input.** Specifically:

- *Static-hold detection from a wrist IMU alone* is fundamentally hard: a front-lever hold produces a near-constant accelerometer signature (low-magnitude gravity vector, minimal gyro), almost indistinguishable from a person hanging still on a bar between reps, lying prone, or standing on hands before kicking up into a handstand. Classification requires either a domain-specific ML model with labelled data that does not exist, *or* multi-sensor fusion (wrist + bar pressure / EMG) outside Apple's APIs.
- *Generic "is the user exercising?"* is feasible (motion-coprocessor walking/running classifier, +HR spike heuristic) but produces high false-positive rates on a busy commute or climbing stairs.
- *Auto-prompt specifically naming "front lever"* requires both the above plus a per-exercise classifier — a research-grade deliverable, not a feature.

**Recommended v1 design:** Tap-to-start (3-second hold on Watch face complication) → user picks "Static holds" → app uses `CMBatchedSensorManager` to segment hold durations automatically → on drop-off, vibration + glance prompt "Front Lever — 12s, save?" with one-tap confirm. The "auto" intelligence lives in *segmentation within a session*, not in *detecting session start*. This is also the pattern Apple itself uses for Outdoor Walk reminders.

**Sources cited:**
- Apple Developer — `HKLiveWorkoutBuilder`, `CMMotionActivityManager`, "Running workout sessions", "Core Motion updates", "What's new in Core Motion" WWDC23 (10179)
- Apple Support — "If the battery in your Apple Watch drains too quickly", "Change settings in Workout on Apple Watch"
- App Store — Gymatic, AutoWorkout, Motra, Slopes, Strong, Hevy listings (descriptions explicit about tap-to-start)
- *Smart Health* / ScienceDirect 2025, PMC6387025, PMC8039266 — IMU activity-classification studies
- HackerNoon "Getting High-Frequency Tennis Motion Data from Apple Watch" — confirms `CMBatchedSensorManager` workout requirement
- Apple Discussions "Automatic workout detection with WatchOS 5" — confirms only 5 activity types supported