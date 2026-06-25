# D14 — Offline behavior

Status: **DRAFT — needs decision before Phase 2 web app**

## Decision
**Offline-first for workout logging.** The user must be able to complete an entire workout session with zero connectivity. Sync happens when connectivity returns.

## What works offline

| Feature | Offline behavior |
|---|---|
| Browse DAG | Yes — cached on first load via Service Worker |
| Open a workout session | Yes — local copy of the node + tree |
| Log a set | Yes — write to local SQLite, queue for sync |
| Hold timer, rep counter | Yes — purely client-side |
| View past workouts | Yes — cached locally |
| See regression suggestion | Yes — `evaluateSetSafety` from doc1 runs client-side |
| Unlock a node visually | Yes — optimistic update |
| Sync workout to server | **No** — queues, sends when online |
| Tendon strain recalculation | **No** — only runs on server (Phase 1.5+) |
| Friend feed (social) | Partial — last 24h cached, no new entries |
| Push notifications | **No** — iOS handles these, will not fire offline |
| Subscribe / manage subscription | **No** — App Store only |

## Sync rules

1. **Workouts sync in completion order.** If the user logs W1 on Monday, W2 on Tuesday, but W1 fails to sync until Wednesday, sync W1 first, then W2.
2. **Server is source of truth.** If server says "this set doesn't unlock the node" but client showed an unlock animation, revert the client state. Toast: "Sync updated your progress. X skill not yet unlocked."
3. **Idempotent.** If the client sends the same workout twice (network glitch), the server dedupes via `client_workout_id` (UUID v7 from client).
4. **Conflict resolution:** server wins. Always. If the user edited a workout offline and the server has a different version (rare — only via support intervention), server version stays.

## Conflict: same workout edited on two devices while offline

This is rare but possible. Server's rule:
- If both devices have logged sets at the same time slot (e.g. 14:32), keep the version with more sets logged.
- If set counts are equal, keep the one with higher total reps/holds.
- If still tied, keep the one from the device that synced first.

The losing device gets a toast: "We synced your workout, but another version already won the merge. Check your history."

## Storage budget

- **Local SQLite**: 50MB cap per user. Oldest 30 days of workouts auto-archived to a compressed blob. User can manually re-download on demand.
- **Service Worker cache**: 20MB for static assets + DAG data. Cleared on app uninstall.
- **Sync queue**: unbounded until synced. Realistically <1MB for a week of workouts.

## Action
T10 (workout log screen) implements offline-first via Service Worker + IndexedDB (via Dexie.js, not raw SQLite — web doesn't have SQLite natively). T6 (sync endpoint) handles idempotent upload + conflict resolution.