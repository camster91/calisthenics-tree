# DECISION.md — Calisthenics Tree

**Status:** Living document. Owner edits when decisions change. Append a row to
the revision log at the bottom; do not delete history.

---

## 1. One-liner

> A real skill tree for calisthenics. Unlock planche, front lever, handstand —
> progression that makes sense, with smart regressions when you fatigue.

---

## 2. Locked decisions

Locked 2026-06-25 from `docs/PLAN.md`. Do not change without updating the
revision log.

| Decision              | Choice                                                                                  | Notes                                                                                          |
|-----------------------|-----------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| Differentiation       | **Path B** (Community / social DAG)                                                     | Cleanest moat; existing 7 apps don't do social well. Schema is indifferent — serves A/B/C.     |
| Hosting               | **Coolify on Ashbi VPS `187.77.26.99`**                                                 | Free, infra you know. One Coolify project per service (`-web`, `-api`, `-db`).                  |
| Domain                | `calisthenics-tree.com`                                                                 | Hyphen in domain, two words in store listing.                                                  |
| App name              | **Calisthenics Tree** (NOT Calisteniapp — live competitor)                              | Verified by name-conflict research.                                                            |
| Bundle ID             | `com.ashbi.calisthenicstree`                                                            | Renamed from `calisteniapp` placeholder.                                                       |
| App Store primary     | Health & Fitness                                                                        |                                                                                                |
| App Store secondary   | Social Networking                                                                       | Supports Path B positioning.                                                                   |
| Pricing               | **$5.99/mo · $29.99/yr (50% off) · $99 lifetime · 7-day trial**                         | Replaces original $4.99 placeholder. 50/50 monthly/annual mix → ~$4.24 blended ARPU.           |
| Analytics             | **PostHog Cloud** (free 1M events/mo)                                                   | Self-host deferred until 5M+ events/mo. Wire in Phase 2.                                      |
| Auth                  | **Apple Sign-In (iOS) + email magic link (web/Android) via Postmark** (~€15/mo at 10K)  | Magic-link backend ships with P2; Apple Sign-In ships with P4 native.                          |

---

## 3. Kill criteria (locked)

Three thresholds, evaluated at the listed anniversary of public launch. If a
threshold trips, follow the action — do not negotiate with yourself.

| Checkpoint          | Threshold                                           | Action                                                                                |
|---------------------|-----------------------------------------------------|---------------------------------------------------------------------------------------|
| **Month 3**         | < 50 free-tier users                                | Pause marketing spend. Reassess positioning, channel, onboarding funnel.               |
| **Month 6**         | MRR < $100                                          | Pause new feature work. Write a post-mortem. Archive the project.                     |
| **Month 12**        | MRR < $500                                          | Accept as a portfolio piece, not a business. Keep the repo; stop active investment.   |

---

## 4. Scope rules — anti-features (don't build)

These were explicitly considered and rejected. Do not add them later without
re-reading `docs/PLAN.md` and updating this document.

- **Custom video upload / video hosting** — use YouTube embeds instead. Hosting
  is a 6-week project on its own and not a differentiator.
- **Social feed beyond friend DAGs and unlock shares** — anything broader drifts
  into a generic social app and breaks the "skill-tree" pitch.
- **Computer-vision form check** — Phase 6+ only, and only if retention data says
  it actually matters. Not on the v1 roadmap.
- **Native Android** — Capacitor wrap handles it. A native Android build is a
  separate 6-week project; revisit only after crossing **$500 MRR**.
- **Voice control / Siri integration** — low ROI, breaks the offline-first
  promise, adds an always-listening surface that complicates App Store review.
- **Coaching video per node** — Path C was rejected for this build on those
  grounds (6-12 months of content production before premium feel).

---

## 5. Decision rules for downstream agents

Read these before you pick up any task. They override anything in older task
bodies that contradicts them.

1. **Phase 1 backend is indifferent to Path B.** The schema serves A/B/C. Don't
   add Path-B-specific backend tables until Phase 2.
2. **Phase 2 UI assumes Path B.** Don't add social-feed UI without re-reading
   `docs/PLAN.md` first. Read-only friend activity lives in a bottom tab;
   nothing broader.
3. **Pricing is `$5.99 / $29.99 / $99`** — not the original `$4.99 / $39.99`.
   Update any task body, doc, or comment that still references the old numbers.
4. **App name is Calisthenics Tree** (hyphen in domain, two words in store
   listing). It is **not** Calisteniapp.
5. **Don't widen parent toolsets in `~/.hermes/config.yaml`.** Pass
   `toolsets=['web','file','terminal']` explicitly per `delegate_task` batch
   instead.

---

## 6. Revision log

| Date       | Change                                                                                      | Author             |
|------------|---------------------------------------------------------------------------------------------|--------------------|
| 2026-06-25 | Initial lock — sourced from `docs/PLAN.md` (locked decisions, kill criteria, anti-features, decision rules). | Cameron (Ashbi)    |
