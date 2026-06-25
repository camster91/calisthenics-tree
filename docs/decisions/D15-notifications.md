# D15 — Notification strategy

Status: **DRAFT — needs decision before Phase 4 native shell**

## When we ask for permission

iOS requires we ask for push permission at a moment of high user value, not at first launch. Apple has rejected apps for asking too early. Rules:

- **Never ask on first launch.** No "Allow notifications?" modal before the user has logged in.
- **Ask after the first meaningful action.** Specifically: after the user logs their 3rd workout, when the app has earned the right to interrupt.
- **Ask with context.** "Stay on track — get a ping when a friend unlocks a skill you both train. Allow notifications?" — never the generic "Allow notifications?"

## What triggers a push

| Event | Push? | Why |
|---|---|---|
| Friend accepted your invite | Yes | Social reciprocity |
| Friend unlocked a skill you also train | Yes | Path B core |
| Friend completed a seasonal event challenge | Yes | FOMO + accountability |
| Tendon deload detected | Yes | Health intervention |
| Weekly summary email ready | No (email instead) | Avoid push fatigue |
| Node unlocked (self) | No (in-app celebration) | User was there for it |
| Subscription renewed | Yes (silent push to update local badge) | Quiet |
| Subscription failed | Yes (urgent) | Money on the line |
| New Pro feature dropped | Yes (max once/month) | Engagement |
| Friend invite expired | No | Don't pester about abandoned invites |
| Generic marketing | **Never** | Apple will reject, users will mute |

## iOS-specific gotchas

- **Silent push** = push with no alert/sound, just `content-available: 1`. Used to refresh data in background. Limited to a few per hour by Apple or the app gets throttled.
- **Critical alerts** = push that bypasses mute and Do Not Disturb. Apple has to approve the entitlement. We don't need it.
- **Time-sensitive notifications** = can interrupt Focus modes. Apple has to approve the entitlement. Useful for the tendon deload alert but not v1.

## Channels

- **iOS push**: APNs via a server library (we'll use `apns2-py` or similar).
- **Web push** (Phase 2+): Web Push API with VAPID keys. Same triggering logic.
- **Email digest**: weekly summary via Postmark. D9 background job.

## Frequency cap

- Max 1 push per user per 6 hours for non-urgent events.
- Subscription failed + tendon deload = exempt from cap.
- Weekly summary is email, not push, so it doesn't count.

## What we explicitly don't do

- **No push for "X people viewed your profile."** Vacuous metric, push spam.
- **No push for "new workout suggested for you."** User opted in via DAG; suggestions are in-app.
- **No push for friend milestones.** "Bianca did 100 workouts!" — we celebrate with the share card, not a push.

## Action
Phase 4 native shell. T18 (share extension) is the first social feature; push for friend unlock follows in T23 (friend DAGs). Server-side: arq job per D9 publishes to APNs.