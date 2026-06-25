# D12 — Error states

Status: **DRAFT — needs decision before Phase 1.5 wireframes**

## Philosophy
**Never show a raw error. Always show what to do.** Users don't care that "an error occurred" — they care "what do I do now."

## Inventory

### Offline (workout mid-session, network drops)
- Banner at top: "You're offline. Sets will sync when you reconnect."
- No modal. No blocking dialog. The user is mid-workout; don't interrupt.
- Timer and set-logger work locally (SQLite per doc1 offline-first).
- Sync indicator: small icon in the header that turns red when offline, animates green when syncing, settles to grey when synced.

### Sync failure (workouts logged offline, but sync to server failed on reconnect)
- Toast: "Couldn't sync 3 workouts. Tap to retry."
- Tap → re-attempts sync. If still fails, escalate to:
- Banner: "Some workouts aren't synced. Pull to refresh, or contact support."
- "Contact support" pre-fills an email with the trace_id from the failed sync.

### Node unlock failure (server says no, after the user thought they completed the threshold)
- Modal: "You didn't quite hit the unlock criteria for [skill name]. You needed [X] reps, got [Y]. Want to try again, or swap to an easier version?"
- CTAs: "Try again" | "Swap to [regression_node]" | "Save what I have"

### Payment failure (Apple StoreKit error)
- Already handled by Apple, but if our backend rejects the receipt verification:
- Toast: "We couldn't verify your subscription. Tap to retry, or contact support."
- DO NOT silently downgrade the user. Keep them on Pro until they fix billing.

### HealthKit permission denied
- First-run modal: "To log workouts to Apple Health and read your body metrics, allow Health access. You can change this in iOS Settings → Privacy → Health."
- CTA: "Open Settings"
- If user dismisses and comes back later, the same prompt on the next workout attempt. Persistent nudge, not annoying reminder.

### HealthKit write failure (user allowed access, write fails)
- Toast: "Couldn't save workout to Apple Health. Saved in the app." — non-blocking, the workout is still in our DB.
- We log the error, don't surface it again unless it persists across 3 workouts.

### Friend invite link expired
- Landing page on calisthenics-tree.com: "This invite expired. Ask [inviter name] to send a new one."
- No "request a new invite" button — avoids spam.

### App store review rejection (Phase 5)
- In-app banner: "Update available — please update to keep using Calisthenics Tree." (not the truth, but the only way Apple allows us to force an update)

## Tone rules

- **Apologize once, then act.** "Sorry, we couldn't sync. We're retrying."
- **Never blame the user.** Not "You went offline." — "Your connection dropped."
- **Never say "this shouldn't happen."** It does happen. Plan for it.
- **No "please try again later."** Give a concrete next action or a timestamp.

## Action
T37 (wireframes) builds these. T7 (Sentry) catches all of them in production with breadcrumbs showing the path to the error.