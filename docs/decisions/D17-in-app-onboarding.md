# D17 — In-app onboarding (post-install)

Status: **DRAFT — needs decision before Phase 2 web app**

## Decision
**Zero hand-holding after the placement flow.** The app teaches by doing, not by explaining. Coachmarks only on screens with non-obvious gestures.

## What we explicitly skip

- Long welcome modals ("Welcome to Calisthenics Tree! Here's what we do...")
- Feature tour slideshows
- "Tap here to log a set" hints on every screen
- Tooltips on every button

Users bounce on hand-holding. The Hevy research showed the top churn reason is "social-feed fatigue" — that's what onboarding-style nagging creates.

## What we DO include

### Single coachmark on the workout screen
After the user's first workout is complete, on the home screen, show ONE tooltip:
- Pointing at the "Start workout" button on the home screen
- Text: "Tap here next time. Your progression unlocks automatically."
- Dismissable with X. Never shows again.

### Single coachmark on the DAG browse
After the user has logged 3 workouts, show:
- Pointing at a node in the tree
- Text: "Hover a node to see what unlocks it. Tap to start a workout there."
- Dismissable.

### Empty state hints (per D11)
These are part of the empty state design, not separate onboarding.

### Re-engagement (after silence)
- Day 3 no-workout: push notification "Your first workout is waiting"
- Day 7 no-workout: email "5 minutes — that's all"
- Day 14 no-workout: in-app banner on home "We've saved your spot"
- Day 30 no-workout: archive account (per D9)

## Tooltip implementation

- One tooltip at a time per screen
- Tooltip dismissals stored in `user.onboarding_dismissals` JSONB column
- Never re-show a dismissed tooltip
- Tooltip copy reviewed by you before shipping (per skill: "Direct, pragmatic, concise. No fluff.")

## What this means for the wireframes (T37)

The 16 screens in the inventory each have an empty + loading + error + success state. They don't have an "onboarding" state. Onboarding is a separate flow that ends when the user lands on the home screen with their placement result.

## Action
T37 (wireframes) includes coachmark slots in the workout and DAG-browse screens. T9 (onboarding flow) routes to home + sets `onboarding_dismissals = {}` on first login.