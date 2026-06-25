# D13 — Onboarding edge cases

Status: **LOCKED** (2026-06-25, finalized for Phase 2 onboarding flow + Phase 4 push notifications)
Implements: T9 (onboarding flow), T2–T7 (placement algorithm), T18 (push notifications, P4), T22 (transactional email — Postmark), T30 (PostHog analytics).
Depends on: D4 (error model — surface any placement API failure with `trace_id`); D9 (background jobs — re-engagement cron jobs run as `BackgroundTasks` at v1, arq at 5K); D11 (empty states — placement result with zero data); D12 (error states — placement API failure, signup network drop); D14 (offline behavior — onboarding works offline; placement queues for sync); D15 (notifications — push + email cadence defined here); D19 (data export/deletion — re-engagement respects `marketing_opt_in = false`).
Supersedes: D13 draft 2026-06-25 (which had the happy path + edge-case list only; this version adds the full skip → placement map, the re-engagement cron schedule, the PostHog funnel events, the Postmark templates, the questions-NOT-asked rationale, and the screen-by-screen error/empty overlap with D11/D12).

## Question

The 3-question + RIR-2 placement flow has a happy path and at least six unhappy ones:

1. **Skip RIR-2 test.** Button to skip? Surface "take it later"?
2. **Lowest-capability user.** Zero pull-ups AND zero active hang — what node?
3. **Skip onboarding entirely.** Sign in but bail before placement.
4. **Cheating.** User lies about their answers (no way to detect in v1).
5. **Re-engagement.** User places but never logs a workout.
6. **Placement drift.** User logs at a node different from their placement.

Wrong choice for any of these = bad first-week retention (lowest-cap users quit because the app feels too easy; placed-and-bailed users never come back; dishonest users skip workouts and blame the app).

## Decision

**Conservative placement + friendly skip + time-bounded re-engagement.** Place every user at the lowest realistic node for their claimed capability. Never punish skipping — surface a "complete later" affordance. Time-box re-engagement to 30 days; after that, archive. Don't try to detect cheating in v1; let the DAG auto-correct based on actual performance.

## The four placement outcomes

The onboarding flow produces exactly one of four `users.placement_state` values. The placement algorithm (T2–T7) reads this and emits a `placement_node_id` per active tree.

| Outcome | Trigger | Where placed | Surfaced copy |
|---|---|---|---|
| `placed` | User answered Q1 + Q2 + completed RIR-2 | Calibrated baseline per tree | "You're starting at Push-up progression, Pull-up progression, Dragon flag progression. Start your first workout." |
| `placed_low` | User answered Q1 + Q2 but **zero** on the relevant scale | Lowest realistic node (see §"Lowest-capability users") | "We've started you at the beginner level. After your first workout, we'll suggest a better fit." |
| `placed_default` | User skipped RIR-2 (Q1 + Q2 answered) | Lowest baseline of the chosen archetype | "We've placed you at the beginner level. Take the test any time from settings to get a more precise plan." |
| `unplaced` | User signed up but bailed before Q2 | No placement; app fully usable; banner on home | "Complete onboarding to unlock your plan. [Resume]" |

`users.placement_state` is nullable (`null` = signed up but hasn't started onboarding at all — the home banner doesn't show until they tap "Get started" once).

## Skip behavior

### Skip the RIR-2 test (`placed_default`)

- **UI:** A "Skip for now" link at the bottom of the `/onboarding/test` screen, styled as a tertiary text button (not a destructive link — it's not a "skip onboarding" CTA, it's "do this later").
- **Placement:** Lowest baseline of the chosen archetype. For the three archetypes:
  - **Pull archetype (Q1=No):** `pull_dead_hang_5s` (5-second dead hang on a pull-up bar)
  - **Push archetype (Q1=Yes, Q2=No):** `push_wall_pushup_3x8` (wall push-ups, 3 sets of 8)
  - **Static archetype (Q2=Yes):** `static_support_hold_5s` (support hold, 5 seconds)
  - **Default if ambiguous:** `push_wall_pushup_3x8` and `pull_dead_hang_5s` simultaneously (the safest pair — both achievable from a standing position, both reversible to harder variants within 1-2 weeks of consistent training).
- **Home affordance:** A persistent (but dismissable-per-day) banner on `/home` reads "Take the placement test to get a more precise plan. [Take it]". The banner re-appears the next day if dismissed.
- **Re-prompt timing:** After the user's 3rd logged workout, send a one-time in-app toast: "You've logged 3 workouts. Want to retake the placement test for a more accurate plan? [Yes] [Not now]". The retake is **optional** — never auto-triggered.

### Skip onboarding entirely (`unplaced`)

- The app is fully usable: the user can browse the public DAG (read-only, no account needed for the landing flow), view static skill pages, and sign up.
- Once signed in, if they close the browser tab before answering Q1, the next session shows them the home screen with a banner.
- **Banner copy:** "Complete onboarding to unlock your plan. [Resume onboarding]" — the CTA resumes at Q1, not at the test screen.
- **What they can do without placement:** Browse DAG, view static skill pages, read tendon strain explainer. They **cannot** log workouts (the `/api/v1/workouts/sync` endpoint requires `placement_state != null` per the API spec — returns 403 with `code: "placement_required"` and a `trace_id` so the banner's "Resume" CTA can deep-link to onboarding).
- **PostHog event:** `onboarding_skipped` (once per session they hit the test screen and leave without completing it).

## Lowest-capability users

The `placed_low` outcome. The placement algorithm uses the same node ids as `placed` and `placed_default` — what differs is which node id is selected.

### Zero pull-ups + zero active hang

- **Push tree:** `push_wall_pushup_3x8` (wall push-up, 3 sets of 8) — the universal "anyone can do this" entry. Works for users who can't get off the floor yet.
- **Pull tree:** `pull_dead_hang_5s` (5-second dead hang on a pull-up bar) — the universal pull entry. Even obese / sedentary users can dead hang for 5 seconds with the right grip cue.
- **Static tree:** `static_support_hold_5s` if Q2 = Yes (advanced upper-body user with weak static holds); `static_tuck_plank_3x10s` if Q1 = Yes, Q2 = No (the safest entry to static work).

### Zero everything (Q1 = No, Q2 = No, RIR-2 = 0)

- **Push tree:** `push_knee_pushup_3x5` (knee push-up, 3 sets of 5) — easier than wall push-up if the user can't generate force from their feet.
- **Pull tree:** `pull_dead_hang_5s` (same as above — there's no easier pull entry).
- **Static tree:** `static_assisted_squat_3x8` (assisted squat using a chair or doorframe, 3 sets of 8) — the easiest entry that still introduces the squat pattern.
- **Coachmark on placement result screen:** "We've started you at the very basics — every workout is 5 minutes or less. The app will level you up automatically as you get stronger. You can always change a workout before starting."

### Why this matters

Wrong placement at the bottom = users feel patronized ("I'm not THAT weak") or overwhelmed ("this is way too hard"). The lowest-capable users have the highest drop-off rate in fitness apps; conservative placement with a "level up after 3 workouts" auto-prompt is the only retention path that works.

## Placement drift

User logs a workout at a node **different** from their placement. Three cases:

1. **One-off:** Logged at a different node because they were traveling / at a different gym. Allow it. Don't fight the user. The next workout reverts to the placement unless they explicitly change it (T11 workout-start screen has a "Change workout" link).
2. **Consistent outperformance:** Logged at the placement node but completed 3+ sets with RIR ≥ 2 for 3 consecutive workouts. The placement auto-promotes to the next node in the active tree. In-app toast: "You're crushing it. We've moved you to the next level."
3. **Consistent underperformance:** Logged at the placement node but failed (couldn't complete the prescribed sets) for 3 consecutive workouts. The placement auto-regresses to the previous node. In-app toast: "We've moved you to an easier level so you can build consistency. No judgment."

The DAG auto-promote / auto-regress logic is in T7 (placement algorithm), triggered by `unlock_detection` background job (D9). The toast is rendered by the `/workout-complete` screen (T12) reading the new `placement_node_id`.

## Re-engagement

User placed but doesn't log a workout. Three touchpoints, then archive. **All three respect `users.marketing_opt_in` (per D19) and the user's notification preferences (per D15).** A user who has opted out of marketing gets **zero** re-engagement — no push, no email. They will only see the in-app banner if they open the app.

### Day 3 — Push notification

- **Trigger:** OS cron at 9am user-local TZ daily, checks `users.placement_state IN ('placed','placed_low','placed_default') AND last_workout_at < NOW() - INTERVAL '3 days' AND push_opt_in = true AND last_reengagement_push_at IS NULL OR last_reengagement_push_at < NOW() - INTERVAL '30 days'`.
- **Copy:** "Your pull-up plan is waiting. [Open the app]"
- **Implementation:** `send_reengagement_push` job (D9), queued by the daily cron. Uses APNs (iOS) / FCM (Android). D15 documents the push provider abstraction.
- **Deduplication:** Once sent, set `last_reengagement_push_at = NOW()`. Don't send again for 30 days even if the user stays cold.

### Day 7 — Email via Postmark

- **Trigger:** Same OS cron, checks `last_workout_at < NOW() - INTERVAL '7 days' AND email_opt_in = true AND last_reengagement_email_at IS NULL`.
- **Template:** Postmark template `reengagement-day-7` — subject "Here's your week 1 routine", body:
  > "Hi {first_name}, you placed at the {archetype} progression last week. Here's your week 1 routine — 3 workouts, 15 minutes total this week. [Open the app]"
- **Implementation:** `send_reengagement_email` job (D9). Uses Postmark (T22 transactional email service — see D19 for the email service choice).
- **Deduplication:** Same as push — set `last_reengagement_email_at = NOW()`, re-eligible in 30 days.

### Day 14 — In-app banner

- **Trigger:** On every `/home` render, check `last_workout_at < NOW() - INTERVAL '14 days' AND banner_dismissed_at < NOW() - INTERVAL '1 day'`.
- **Copy:** "We saved your spot. [Tap to start your next workout]."
- **Dismissible** per session. Re-appears the next day.
- **No push or email at this point** — the user has the app installed and open; surfacing it in-app is enough.

### Day 30 — Archive

- **Trigger:** `cleanup_unverified_users` job (D9), runs daily at 3am UTC, checks `placed_at < NOW() - INTERVAL '30 days' AND last_workout_at IS NULL`.
- **Action:** Soft-delete (`users.deleted_at = NOW()`), set `placement_state = NULL`, send a final "Your account is paused" email (Postmark template `account-paused`) only if `email_opt_in = true`. Hard-delete after 30 more days per D19.
- **PostHog:** Mark the user as `cold_lead` in their profile properties (per D30 PostHog setup). They re-enter the re-engagement cycle only if they create a new account from the same email (the email is blacklisted in Postmark and PostHog is keyed on distinct_id).

### What if they come back after archive?

- They sign in with the same email. The login flow detects `users.deleted_at IS NOT NULL` and offers: "Welcome back. Your previous plan was paused. [Resume my plan] [Start fresh]". Resume restores `placement_state` and `placement_node_id`; Start fresh re-runs onboarding.

## Cheating — known gap, not addressed in v1

**We can't detect lying. We don't try.** Placement is a starting point, not a verdict.

Why:
- Self-reported RIR-2 is hard to verify without a video. Video is too expensive (storage, review, moderation).
- Lying in week 1 doesn't hurt long-term outcomes because the DAG auto-promotes / auto-regresses within 3 workouts of real data.
- Users who place too high hit a "can't do this workout" error after 3 attempts and the app moves them down. Users who place too low get auto-promoted within 3-5 workouts.

What we **do** log: `placement_self_reported = true` on the `users` row. If/when v2 adds video verification, the flag tells us which placements to re-validate first.

## Questions we don't ask

Onboarding is short on purpose. Every question has a cost (drop-off, PII, lying). Questions cut from v1:

| Question | Why cut |
|---|---|
| "How old are you?" | Affects nothing in the placement algorithm (calisthenics progressions are age-agnostic). Users lie. PII. |
| "What's your gender?" | Affects nothing for calisthenics. PII. |
| "What's your body weight?" | Affects load calculations (weighted progressions in Path C), but Path C is not in v1. Cut until Path C ships. |
| "What's your training goal?" (strength vs hypertrophy vs skill) | Implied by which tree the user is on. Asking creates a fork we'd have to reconcile with the DAG. |
| "How often do you train per week?" | We schedule 3 workouts/week by default. Custom scheduling is a v2 feature. |
| "Do you have any injuries?" | Liability. We surface a generic "consult a physician" disclaimer on the placement result screen. Per-injury routing is v2. |

## PostHog events

Per D30 (PostHog setup), the placement funnel emits these events. The funnel analysis answers "where do users drop?" and "do placed users actually log a workout?".

| Event | When | Properties |
|---|---|---|
| `onboarding_started` | User reaches `/onboarding/q1` | `distinct_id`, `auth_provider` |
| `onboarding_q1_answered` | Q1 answered | `answer` (`yes` / `no`) |
| `onboarding_q2_answered` | Q2 answered | `answer` (`yes` / `no`) |
| `onboarding_q3_answered` | Q3 answered (only if Q2 = No) | `answer` (`yes` / `no`) |
| `onboarding_test_started` | User reaches `/onboarding/test` | `archetype` (`push` / `pull` / `static`) |
| `onboarding_test_completed` | RIR-2 test submitted | `archetype`, `rir2_reps` |
| `onboarding_test_skipped` | User tapped "Skip for now" | `archetype` |
| `onboarding_skipped` | User left without completing | `last_step` (`q1` / `q2` / `q3` / `test` / `result`) |
| `placement_set` | Placement written | `placement_state`, `placement_node_id`, `placement_self_reported` |
| `workout_logged` | First workout logged | `node_id`, `days_since_placement` |
| `reengagement_push_sent` | Day 3 push sent | `days_since_placement` |
| `reengagement_email_sent` | Day 7 email sent | `days_since_placement` |
| `account_paused` | Day 30 archive | `days_since_placement`, `workouts_logged` |

Funnels:
- **Placement funnel:** `onboarding_started` → `onboarding_q1_answered` → `onboarding_q2_answered` → `onboarding_test_completed` → `placement_set` → `workout_logged`. Drop-off at each step is the headline metric for onboarding.
- **Re-engagement funnel:** `placement_set` → (`reengagement_push_sent` / `reengagement_email_sent`) → `workout_logged`. If push converts < 5%, kill it at 1k MAU.

## Data model

Three fields on `users` (per D19 schema):

```sql
placement_state           TEXT NULL  -- 'placed' | 'placed_low' | 'placed_default' | 'unplaced'
placement_node_id         TEXT NULL  -- FK to skill_nodes; per-tree placement stored in user_progressions
placement_self_reported   BOOLEAN NOT NULL DEFAULT false
last_workout_at           TIMESTAMPTZ NULL
placed_at                 TIMESTAMPTZ NULL  -- set when placement_state transitions from NULL to a value
last_reengagement_push_at TIMESTAMPTZ NULL
last_reengagement_email_at TIMESTAMPTZ NULL
banner_dismissed_at       TIMESTAMPTZ NULL
deleted_at                TIMESTAMPTZ NULL  -- soft delete (D19)
```

Per-tree placement lives in `user_progressions(user_id, tree, current_node_id, last_promoted_at)` — one row per active tree. Set by T7 placement algorithm; updated by `unlock_detection` job on every workout write.

## Implementation checklist (T9 + T2-T7 + T18 + T22)

1. **T9 (onboarding flow):** Build `/onboarding/q1`, `/q2`, `/q3`, `/test`, `/result` with the "Skip for now" tertiary button on `/test`, the resume link on `/home` for `unplaced` users, and the in-app retake toast after the 3rd workout.
2. **T2-T7 (placement algorithm):** Implement the four `placement_state` values and the lowest-capable node mapping (§"Lowest-capability users"). The function signature: `place_user(user_id, q1, q2, q3, rir2_reps) -> PlacementResult` with `state`, `nodes` (dict of tree → node_id), `self_reported: bool`.
3. **T18 (push notifications, P4):** Wire APNs / FCM. Add the `send_reengagement_push` job (D9) and the dedup fields to the cron query.
4. **T22 (Postmark transactional email):** Create the three templates (`reengagement-day-7`, `account-paused`, `welcome-back`). Wire the `send_reengagement_email` job (D9). Respect `users.email_opt_in` from D19.
5. **T30 (PostHog):** Emit the 13 events from §"PostHog events". Build the placement funnel dashboard.
6. **D9 jobs:** `send_reengagement_push`, `send_reengagement_email`, `cleanup_unverified_users` (already in D9 spec, no change needed other than the SQL above).
7. **Wireframes (T37):** Every onboarding screen renders its `error` state per D12 (placement API failure → "We couldn't save your placement. Tap to retry." with `trace_id`).
8. **Empty state on placement result:** Per D11, if the user's DAG has zero unlocked nodes yet (impossible on first placement, but possible if they later reset), render the empty-state variant.

## Action

T9 + T2-T7 implement the placement algorithm and the onboarding UI by Phase 2. T18 + T22 wire re-engagement by Phase 4. T30 instruments the funnel from day 1 so we can see drop-off in production. The cheater-detection gap is documented in the v2 backlog; we don't try to solve it in v1.
