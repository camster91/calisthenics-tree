# D13 — Onboarding edge cases

Status: **DRAFT — needs decision before Phase 2 web app**

## The 3-question + RIR-2 placement flow has a happy path and a bunch of unhappy ones.

## Happy path
1. Q1: "Can you perform 1 clean pull-up?" → Yes
2. Q2: "Can you hold Support Hold on parallel bars 15s?" → Yes
3. RIR-2 pushup test: 8 reps → place at baseline node
4. Result: "You're starting at Push-up progression, Pull-up progression, Dragon flag progression. Start your first workout."

## Edge cases

### Skip the RIR-2 test entirely
- A "Skip for now" link at the bottom of the test screen
- If skipped, place at the lowest baseline of the chosen archetype (conservative default)
- Don't punish: "We've started you at the beginner level. After your first workout, we'll suggest a better fit."
- Re-prompt for the test after the 3rd workout — they have data now, test is optional.

### Q1 = Yes, Q2 = No (advanced-ish upper body, weak static holds)
- Path: Intermediate progression tree (upper body), Novice B progression tree (static holds)
- Q3 skipped (no point asking Active Hang if they can't hold Support)
- RIR-2 test still applies → baselines adjust per archetype

### Q1 = No, Q3 = No (total beginner)
- Path: Beginner across all three trees
- RIR-2 test still applies — but the prompt is friendlier: "Do as many knee pushups as you can. Stop when your speed slows down."
- Result copy: "Welcome. We'll start with the very basics. Each workout is short."

### Liar detection
We can't detect lying. We don't try. Placement is a starting point, not a verdict. After 3 workouts, we have actual performance data — the DAG will suggest moving up or down based on real numbers.

### User on placement but never logs a workout
- Day 3: push notification "Your first workout is waiting"
- Day 7: email "Here's how to start — 5 minutes, that's all"
- Day 14: in-app banner on home "We saved your spot. Tap to start."
- Day 30: archive the account (per D9 cleanup job)

### User logs a workout at a different node than their placement suggested
- Allow it. Don't fight the user.
- The DAG will auto-promote or auto-regress based on performance.
- If they consistently outperform their placed node by 3+ workouts, the system suggests "Try the next level."

### Multi-device placement (user does Q1 on phone, RIR-2 on iPad)
- Each step saves progress server-side (auth required for placement)
- Resume from where they left off
- Don't re-ask answered questions

## What we don't do

- We don't ask "How old are you?" — affects nothing, users lie, and it's PII.
- We don't ask "What's your gender?" — affects nothing for calisthenics.
- We don't ask "What's your body weight?" — affects load calculations (Path C, not Path B). Skip in v1.
- We don't ask "What's your training goal?" — strength vs hypertrophy vs skill is implied by using the app.

## Action
T9 (onboarding flow) implements these. T30 (PostHog) tracks the placement funnel so we can see where users drop.