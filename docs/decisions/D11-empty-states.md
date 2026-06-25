# D11 — Empty states inventory

Status: **DRAFT — needs decision before Phase 1.5 wireframes**

## Why this matters
Per the Hevy research, empty states are where apps lose users. "No friends yet" with a sad face kills social features. Every empty state needs:
1. **What the user is looking at** (clarity, no shame)
2. **Why it's empty** (legitimate state, not an error)
3. **What to do next** (single primary CTA, never more)

## Inventory

### No workouts logged yet (Home, post-onboarding)
- Hero: "Start your first workout"
- Body: "Pick a node from your skill tree, log a few sets, and we'll show you what's next."
- CTA: "Open my skill tree" → routes to DAG browse

### No nodes unlocked yet (DAG browse)
- Hero: "Your tree is growing"
- Body: "Complete your first workout to unlock your first skill. We'll mark it on the map."
- CTA: "Start a workout"

### No friends yet (Social feed)
- Hero: "Train with people you know"
- Body: "Invite your training partners. You'll see their unlocks here and they can see yours."
- CTA: "Invite friends" → opens native share sheet with pre-filled message

### No friend invites sent yet (Invite modal)
- Hero: "Pick someone to train with"
- Body: "Anyone who's into calisthenics. Send them a link."
- CTA: "Share invite link" → native share sheet

### No notifications yet (Notifications tab)
- Hero: "You're all caught up"
- Body: "We'll ping you when a friend unlocks something, your tendon strain hits a deload, or you have a weekly summary waiting."
- CTA: "Dismiss" — no other action. This screen is informational only.

### No tendon data yet (Tendon strain detail)
- Hero: "Tracking your joint health"
- Body: "Log 7 days of workouts and we'll show you your straight-arm, bent-arm, and wrist load patterns. If anything trends toward injury risk, we'll tell you before it hurts."
- CTA: "Log a workout"

### No Pro subscription (Paywall triggered by Pro node tap)
- Hero: "Unlock [skill name]"
- Body: "Pro members get the full skill tree, real-time regressions, and friend challenges. Try it free for 7 days."
- CTA: "Start 7-day free trial"
- Secondary: "Restore purchases" | "Learn more"

### No subscription yet, on free tier (Settings)
- Hero: "You're on the Free plan"
- Body: "Basic logging, the Push/Pull/Core beginner trees, and the social feed. Upgrade for the full skill tree, real-time regressions, and seasonal events."
- CTA: "See Pro features"

### Failed payment (Settings → Subscription)
- Hero: "Your subscription is paused"
- Body: "We couldn't process your last payment. Update your billing to keep your Pro features."
- CTA: "Update payment" (deep-links to App Store subscription management)

### Search returned no results (later feature, sketch only)
- Hero: "Nothing matches"
- Body: "Try a different skill name or browse the tree."
- CTA: "Browse the tree"

## Common rules

- **Never use the word "empty"** in copy. It sounds like a bug.
- **Always explain why** the screen is in this state.
- **One CTA, primary color**. Secondary actions (Restore purchases, Learn more) are tertiary text links, not buttons.
- **No illustrations of sad faces**. Icons (people, trees, dumbbells) work better.
- **No "coming soon!"** placeholders for unbuilt features.

## Action
T37 (wireframes) builds these as part of the screen inventory. Each screen has empty + loading + error + success states.