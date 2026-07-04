# Sprint 42 — UX hardening + mobile-ready

**Date drafted:** 2026-07-02 (post-Sprint 41 audit synthesis)
**Goal:** Close the 5 Tier-1 UX findings from the swarm audit so the app feels polished on mobile + handles errors gracefully.

---

## Scope — 5 features, ~4 hours total

| # | Feature | Source | Est | Files |
|---|---|---|---|---|
| 1 | Mobile nav (hamburger + bottom tab bar) | UX #1 | 90 min | `apps/web/src/components/layout/Layout.tsx`, `apps/web/src/components/ui/sheet.tsx` (already exists) |
| 2 | 404 page (`<NotFoundPage>` + public catch-all) | UX #3 | 30 min | `apps/web/src/App.tsx`, new `apps/web/src/pages/NotFoundPage.tsx` |
| 3 | `apiErrorToMessage()` helper in `api.ts` | UX #5 | 20 min | `apps/web/src/lib/api.ts`, 4 call sites |
| 4 | SearchPage dead-link fix | UX #2 ∩ Code-quality R1 | 30 min | `apps/api/calisthenics_api/routes/search.py`, `apps/web/src/pages/SearchPage.tsx` |
| 5 | Offline banner (`navigator.onLine`) | UX #4 | 60 min | new `apps/web/src/components/layout/OfflineBanner.tsx`, mount in `Layout.tsx` |

---

## Sprint 42 PR shape — recommended 3-PR split

### PR 42-1: Mobile nav (UX #1)

**Why first:** This is the highest-impact single change. Without it, **a US/EU mostly-mobile audience cannot reach 5/6 main tabs** of the authed app.

**Approach:**
- Hamburger trigger in `Layout.tsx` (top-right, Menu icon) → opens existing `Sheet` primitive at `side="bottom"`.
- Bottom tab bar (sticky, `fixed bottom-0 left-0 right-0`) for the 3 most-used destinations: Home, Workout, Feed. Settings + Insights + History are reachable via hamburger.
- Hamburger slides up nav-list (Home, Workout, Feed, History, Settings, Insights) + Sign-out button.
- Header search bar stays as-is (already `hidden sm:block`, mobile users will use the menu instead).

**Demo-first:** Mockup the final layout first in two states (closed + open). Cameron approves → ship.

### PR 42-2: 404 page (UX #3)

**Why second:** Publicly visible, instantly boosts perceived quality, simple to ship.

**Approach:**
- New `apps/web/src/pages/NotFoundPage.tsx`: icon + "Page not found" headline + "Back to home" CTA + deep-links to try `/tree/{push,pull,core,legs}`.
- Mount as `<Route path="*" element={<NotFoundPage />} />` at the END of the public routes block (outside `RequireAuth` / `RequireOnboarded`).
- Wireframe ASCII:
```
┌──────────────────────────────┐
│         [? icon]             │
│  Page not found              │
│  We don't have a /foo        │
│  Try the [P] [Pu] [Co] tabs  │
│  [Back to home]  [Search]    │
└──────────────────────────────┘
```

**Demo-first:** A Live route preview screenshot of `/foo` showing the 404 page.

### PR 42-3: apiErrorToMessage + Search fix + offline banner (UX #2 + #4 + #5)

**Why bundle these three:** Each is small individually; together they round out the error/network edge cases. All backend-touch (1 of 3) and low-risk.

**apiErrorToMessage() helper in api.ts:**

```typescript
export function apiErrorToMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Your session ended. Sign in again.';
    if (err.status === 429) return 'Too many tries. Wait a minute and try again.';
    if (err.status === 404) return "We couldn't find that.";
    if (err.status >= 500) return "Our server hiccuped. Try again in a minute.";
    if (err.status >= 400) {
      // Extract FastAPI detail if present
      const detail = err.detail;
      if (typeof detail === 'string') return detail;
    }
  }
  if (err instanceof TypeError) return "You're offline. We'll save your work and sync later.";
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Try again.';
}
```

**Call sites to update:**
- `LoginPage.tsx:77-84`
- `AuthVerifyPage.tsx:73-81`
- `OnboardingResultPage.tsx:88-93`
- `SettingsPage.DangerZone.tsx:60-66, 88-93`

**SearchPage fix (UX #2 ∩ Code-quality R1):**
1. Add `tree_slug` to `apps/api/calisthenics_api/routes/search.py` response payload (ProgressionTree.slug alongside the node).
2. Update `nodeIdToSlug(id, name, tree_slug)` in `SearchPage.tsx:208-247` to rebuild `{tree_slug}-r{rank}-{name-slug}`.
3. Remove the `return ''` fallback (every search hit now lands on a real `/learn/<slug>`).

**Offline banner (UX #4):**
- New `apps/web/src/components/layout/OfflineBanner.tsx` — listens to `online` / `offline` events.
- Mount inside `<Layout>` so it sits under the safe-area header.
- Copy in 12th-grade English: "You're offline. Workouts save on this device and sync when you're back online."

---

## Decisions Cameron needs to call

| Decision | Needed for | Options |
|---|---|---|
| (UX) 3 vs 5 bottom-tab items | PR 42-1 | 3 (Home/Workout/Feed) vs 5 (+Settings/Insights) — depends on whether mobile users actually use Insights or not |
| (search) Where does tree_slug live in the response — top-level on the node OR inside a `_embedded.tree` block? | PR 42-3 | Top-level (simpler API) vs HATEOAS-style `_embedded` (more standard but harder to consume) |
| (offline banner) Auto-show on mount if already offline, OR only after a network event? | PR 42-3 | Auto-show on mount (graceful) vs event-only (saves one render but misses the "already offline on page load" case) |

All three are 1-line calls. My defaults are 3 tabs + top-level tree_slug + auto-show on mount.

---

## Dependency map

PR 42-1 (mobile nav) and PR 42-2 (404) are fully independent.

PR 42-3 (apiErrorToMessage + search + offline) bundles three because each is small and they all touch `Layout.tsx` / nav chrome in different ways. Could split if you prefer.

All three can ship in parallel — no cross-dependencies between them.

---

## Wireframes from the UX slice (already drafted)

The UX swarm slice has wireframes queued for:
- (a) mobile primary nav + bottom-tab bar
- (b) /404 page
- (c) dashboard for sign-out discoverability (related to PR 42-3)

Will surface the Figma-style wireframes when PR 42-1 / 42-2 are scoped. Cameron reviews before code is cut.

---

## Estimated total impact

If all 3 PRs ship:
- **Mobile UX**: from "broken (authed app unreachable)" → "polished (hamburger + bottom tabs)"
- **Error handling**: from "raw `${status} ${detail}` to user" → "actionable plain English"
- **Network resilience**: from "raw error on offline" → "sticky banner + queued sync"
- **Search**: from "every hit is a dead-end bounce to /" → "every hit lands on `/learn/{slug}`"

These are the 4 things a casual demo viewer would notice most on first impression. Sprint 42 turns the app from "functional" to "feels finished."
