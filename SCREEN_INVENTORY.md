# Calisthenics Tree — Screen Inventory (v1)

T37 deliverable, part one: every screen in v1 with states. Drives the wireframe
work in `apps/web/src/pages/wireframes/` and is the source of truth for what
the design system has to support.

## Conventions

- **Route** uses the production path. Wireframes live at `/wireframes/<name>`
  and alias to the production route for review.
- **States** every screen renders: `empty` (no data yet), `loading` (skeleton),
  `error` (inline error with retry), `success` (real content).
- **Auth** `public` (no token), `authed` (token required). Onboarding,
  landing, login, paywall are public; everything else authed.
- **Variant** each screen has a `default` and `gym-glare` render, plus a
  `mobile | tablet | desktop` breakpoint check.

## Screen list

| # | Screen                       | Route                                | Auth   | States                | Priority |
|---|------------------------------|--------------------------------------|--------|-----------------------|----------|
| 1 | Landing / marketing          | `/`                                  | public | success               | P2       |
| 2 | Login / Sign in              | `/login`                             | public | empty/error           | P1       |
| 3 | Onboarding Q1 (pull-up?)     | `/onboarding/q1`                     | public | success               | P0       |
| 4 | Onboarding Q2/Q3 (branching) | `/onboarding/q2` · `/onboarding/q3`  | public | success               | P0       |
| 5 | Onboarding RIR-2 pushup test | `/onboarding/test`                   | public | empty/loading/success | P0       |
| 6 | Onboarding placement result  | `/onboarding/result`                 | public | success               | P0       |
| 7 | Home (DAG browse default)    | `/`                                  | authed | empty/loading/error/success | P0 |
| 8 | Workout log                  | `/workout/:node_id`                  | authed | empty/loading/error/success | P0 |
| 9 | Workout complete             | `/workout/:node_id/done`             | authed | success               | P0       |
| 10| Social feed                  | `/feed`                              | authed | empty/loading/success | P1       |
| 11| Friend profile               | `/u/:handle`                         | authed | loading/success       | P2       |
| 12| Tendon strain detail         | `/insights/tendon`                   | authed | loading/success       | P1       |
| 13| Settings                     | `/settings`                          | authed | success               | P2       |
| 14| Paywall                      | `/paywall`                           | public | success               | P1       |
| 15| Subscription management      | `/settings/subscription`             | authed | empty/loading/success | P1       |
| 16| Empty states (3)             | inline (no workouts / friends / nodes unlocked) | authed | success       | P1       |

Note: screens 1 and 7 share the production route `/`. The wireframe set splits
them: landing for marketing visitors, home for authed DAG browse.

## States matrix

| State     | Visual cue                              | Required components                       |
|-----------|-----------------------------------------|-------------------------------------------|
| `empty`   | Icon + headline + body + primary CTA    | `EmptyState`, primary CTA                 |
| `loading` | Skeleton blocks matching layout         | `Skeleton` (line, block, circle, ring)    |
| `error`   | Red banner + retry button               | inline alert, `btn-danger`                |
| `success` | Real content per screen                 | screen-specific                           |

## State → Wireframe inventory (16 screens × up to 4 states = 60 renders)

For the wireframe review, only the most informative state per screen ships a
rendered route. Default rule: `success` (or `empty` for screens that are
fundamentally empty-state-first). Screens with multi-state UX show a
`/wireframes/<name>?state=<empty|loading|error|success>` query string.

- **Single-render** (1 wireframe each, 9 screens): landing, login, onboarding
  q1, q2, q3, test (loading + success), result, home (success), workout done,
  friend profile, tendon insight, settings, paywall, subscription.
- **Multi-state** (4 wireframes each, 2 screens): home, workout log.
- **Empty-state patterns** (3 reusable wireframes): no-workouts, no-friends,
  no-nodes-unlocked.

## Route map (production)

```
/                                          (marketing OR authed home)
/login                                     (sign in)
/onboarding/q1 | q2 | q3 | test | result    (placement flow)
/workout/:node_id                          (logging)
/workout/:node_id/done                     (post-set summary)
/feed                                      (social)
/u/:handle                                 (friend profile)
/insights/tendon                           (recovery detail)
/settings                                  (account + theme)
/settings/subscription                     (billing)
/paywall                                   (upgrade modal-screen)
```

## Reusable primitives (in `src/pages/wireframes/_primitives/`)

- `Shell` — wraps wireframes in real `Layout` so nav/footer are consistent.
- `PageHeader` — title + optional subtitle + optional CTA slot.
- `Section` — vertical rhythm container.
- `EmptyState` — icon + headline + body + CTA.
- `Skeleton` — line/block/circle/ring variants.
- `InlineError` — banner with retry.
- `StateSwitcher` — query-string-driven state preview (no full re-render).

## Open questions for downstream workers

- Workout log `#8`: does the timer take a separate fullscreen route, or live
  inline? Wireframe shows inline (collapsed → expanded). If timer gets its
  own route, add `T37.b` to the next batch.
- Friend profile `#11`: do we render the friend's DAG inline or link out to
  their public read-only tree? Wireframe shows inline preview (collapsed).
- Tendon insight `#12`: is this a modal from home or a dedicated route?
  Wireframe shows dedicated route (`/insights/tendon`) — confirm with
  product.

## Acceptance criteria

1. Every screen renders a wireframe at `/wireframes/<name>`.
2. The wireframe index at `/wireframes` lists all 16 with thumbnails.
3. Each wireframe uses real `Layout` + `tokens.ts` — no inline hex colors,
   no hardcoded fonts.
4. axe-core passes on every wireframe (verified in T38 / `a11y` skill flow).
5. Mobile (375px) + desktop (1280px) screenshots land in
   `apps/web/wireframes/screenshots/`.