# Calisthenics Tree: design and marketing brief

Version 1, 2026-10-04. Repo: camster91/calisthenics-tree (FastAPI + Postgres API, React 19 + Vite + Tailwind v4 SPA). App runs at workout.ashbi.ca behind Traefik; the planned public domain is calisthenics-tree.com.

**Respect Cameron's existing direction.** `docs/PLAN.md` Phase 2.5 (V3 visual system) and `docs/design/asset-prompts.md` already define the look: premium dark fitness app, Apple Fitness-like energy without copying Apple, a movement palette, heavy display type. This brief applies that direction. The Today-first product rework in Phase 2.5 is NOT in scope here; market only what's built today.

## 1. Positioning

- **One-liner:** A real skill tree for calisthenics. Start at your level, unlock the next move when you've earned it, and back off before your tendons make you.
- **Category shelf:** calisthenics apps (Calisteniapp, Thenx, Madbarz, Caliverse), generic workout loggers (Strong, Hevy), YouTube + spreadsheets.
- **Why it wins:**
  - Progressions are a real graph: ranked nodes per tree with regression and lateral edges (seeded in `0001_initial.py`).
  - Placement: three quick questions plus a sub-maximal test put you on the right rung, not rung one.
  - Smart regressions: a rolling tendon-strain score per joint pathway suggests a regression when load spikes (verify the threshold in `apps/api/calisthenics_api/tendon`).
  - Built for the gym floor: rep counter and timer, gym-glare high-contrast mode, shareable unlock cards, friends feed.
- **Audience:** self-coached bodyweight trainees, 18–40, past the beginner YouTube phase, chasing a first pull-up, handstand, front lever, L-sit or dragon flag. Secondary: people returning from an elbow/wrist niggle who want to progress without flaring it.
- **Anti-persona:** people who want a coach-led video class library or a weight-room program.
- **Objections:** Is it for beginners? (Yes: wall push-up and dead hang are rank 1.) Do I need equipment? (A bar helps for Pull; verify per tree.) Does it cost anything? (No paywall exists today. Locked pricing in DECISION.md is $5.99/mo, $29.99/yr, $99 lifetime with a 7-day trial, but don't publish prices until the paywall ships; say "Free while in early access" only if that's true in code.) Is the strain stuff medical advice? (No; say so.)

## 2. Voice

A strong training partner: direct, short, a bit of swagger, never bro-y. Use real skill names (tuck front lever, pike push-up, L-sit). Numbers only where they're real (30 nodes, 3 trees, ranks 1-10: verify). No "unlock your potential", no "AI-powered", no fake user counts or testimonials. The strain score is guidance, not medical advice.

## 3. Visual direction (Brand Lock, from PLAN.md V3)

| Token | Hex | Role |
|---|---|---|
| Black | `#000000` | Page background (true black) |
| Lift | `#0A0A0C` / `#1C1C1E` | Cards / pressed |
| White | `#FFFFFF` | Primary text; secondary `#AEAEB2` |
| Push | `#FF6B1A` | Brand primary, Push tree, primary CTA (black text on it) |
| Pull | `#64D2FF` | Pull tree |
| Core | `#BF5AF2` | Core tree |
| Legs / success | `#30D158` | Legs tree (if present), unlocked / success |
| Caution | `#FFD60A` | Strain warnings, regressions |

- **Type:** Display is **Saira** (variable, width axis about 75-85, weight 800, tight -0.02em) for headlines and big metrics. It reads like a scoreboard/athletic numeral face, so it carries personality. UI/body is **Geist** (400/500/600) with tabular figures. Both come from Google Fonts with `display=swap`. Replace Inter; keep JetBrains Mono only where code-like data needs it (or drop it).
- **Shape:** keep the app's squircle radii (20px primary, 28px hero), glass surfaces only for floating sheets, a soft wide glow only on the current node / primary CTA.
- **The memorable element:** the **lit skill path**. In the hero, an SVG skill tree whose nodes light up in sequence from rank 1 to the visitor's "current" node (one orchestrated animation, respecting `prefers-reduced-motion`). Elsewhere the path motif is used sparingly as a divider/progress line.
- **Don'ts:** generic gym clipart, stock-photo athletes, gradient text, rainbow everywhere (one movement colour per section), uppercase eyebrows over every heading, "01/02/03" except for real sequences, Apple UI/icons/fonts.

## 4. Marketing site (standalone static, SEO-friendly)

The app is a client-rendered SPA, so the marketing site is a separate static site in `marketing-site/` (plain HTML + one CSS + minimal JS, no build step), deployable at calisthenics-tree.com with the app on its own host. The existing in-app `/welcome` gets a light restyle to match and links to the same CTAs.

```
/                 Home
/skills/          The trees: Vertical Push, Horizontal Pull, Core (+ Legs if seeded), with every rank listed from the seed data (great for SEO: "front lever progression", "handstand push-up progression", "dragon flag progression")
/strain/          How smart regressions and the tendon-strain score work (plain-English, with the not-medical-advice note)
/404.html, robots.txt, sitemap.xml, site.webmanifest
```
- App base URL in ONE place (default `https://workout.ashbi.ca`). CTAs: "Find your level" → `/onboarding/q1`; "Sign in" → `/login`. Node links can point at the app's existing `/learn/:slug` pages if they're public.
- Header: logo + wordmark, Skills, How it adapts, Sign in, primary CTA. Footer: Product, Skills (one link per tree), Legal (app `/privacy`, `/terms`).

## 5. Home copy (verify every claim against code; drop what isn't built)

- **H1:** **Earn every skill.**
- **Sub:** Calisthenics Tree places you on the right rung of a real progression tree, then moves you up when you've earned it, and backs you off when your tendons need a break.
- **CTA:** "Find your level" (primary), "See the skill trees" (secondary). Under: "Takes about two minutes. No equipment needed to start."
- **Alt headlines:** "Your next skill is one rung away." / "Progressions that respect your tendons."
- **Proof strip (facts only):** "30 skill nodes across 3 trees", "Placement test, not guesswork", "Strain-aware regressions", "Gym-glare mode for bright gyms".
- **How it works (real sequence):** 1. Answer three questions and do one test set. 2. Train today's node with the built-in timer and rep counter. 3. Hit the target and the next node unlocks; overdo it and you get a smarter regression.
- **Feature rows:** "A tree, not a to-do list" (sigils push/pull/core, `skill-path.webp`); "Placement that respects where you are" (`placement.svg`, `onboarding-handstand.webp`); "Backs off before you get hurt" (`strain.svg`, `tendon-arm.webp`); "Unlocks worth sharing" (`unlock.svg`, `unlock-celebration.webp`; share cards + friends feed if public).
- **Trees section:** three cards (Push orange, Pull blue, Core violet) with sigil, arc ("Wall push-up → planche push-up"), and "See all 10 ranks" → `/skills/#push` etc.
- **Pricing teaser:** only "Free while in early access" if true. Otherwise omit.
- **FAQ (+ FAQPage JSON-LD):** Is it for beginners? Do I need equipment? How does placement work? What's the strain score? Is it medical advice? Is there an app store app? (Only if true.) What does it cost?
- **Final CTA:** H2 "Start on the right rung." CTA "Find your level".

## 6. SEO

- Home title: "Calisthenics Tree: Skill Tree & Progression App for Calisthenics" (trim to ≤60). Meta: "Find your level, follow real progressions to the front lever, handstand push-up and dragon flag, and back off before your tendons flare. Free to start."
- Keywords: calisthenics progression, calisthenics skill tree, front lever progression, handstand push-up progression, dragon flag progression, pull-up progression, tendon strain calisthenics.
- JSON-LD: `SoftwareApplication` (HealthApplication), `FAQPage`, `BreadcrumbList` on /skills/ and /strain/, `HowTo` is optional for the progression lists. OG `og.jpg`.

## 7. App UI polish (scope)

- Fonts: Saira display + Geist UI (index.html link + tokens). Keep the token pipeline (`src/tokens.ts` → `scripts/build-theme.mjs` → `index.css`); don't hand-edit generated output.
- Logo: header, login, favicon (`public/favicon.svg`), PWA icons (`public/icons/icon-192/512.png`, `icon.svg`, manifest). Leave native App Store screenshot pipeline alone.
- Tree page / skill family headers: use the push/pull/core sigils and movement colours.
- Onboarding: `onboarding-handstand.webp` as hero art on the first step; large tappable answer states.
- Workout done: `unlock-celebration.webp` behind the result.
- Empty states: `empty-node.webp` + one sentence + one action.
- `/welcome`: restyle to match the marketing site (it stays as the in-app public page).
- Don't touch the API, auth, migrations, analytics keys or secrets.

## 8. Assets (`/workspace/brand-assets/calisthenics-tree/web/`)

All made with Higgsfield (Recraft V4.1 vector for marks/icons, Seedream 5.0 Pro for art).

| File | Use |
|---|---|
| `logo-mark.svg` (from `logo-c-bar-steps.svg`) | **Recommended logo**: a pull-up bar with three rising nodes, the top one Push orange. Needs Cameron's approval |
| `logo-a-node-tree.svg`, `logo-b-handstand-tree.svg` | Alternatives (not committed). B, a human "tree" figure, is the most playful |
| `icon-512.png`, `icon-192.png`, `apple-touch-icon.png`, `favicon-32.png` | App icons (mark on black) |
| `hero-handstand.webp` | Home hero (handstand on parallettes with a lit skill tree; text-safe left 45%) |
| `onboarding-handstand.webp` | Onboarding hero / placement feature |
| `skill-path.webp` | "A tree, not a to-do list" feature / skills page header |
| `tendon-arm.webp` | Strain feature / /strain/ hero |
| `unlock-celebration.webp` | Unlock feature / workout-done screen |
| `empty-node.webp` | Empty states, 404 |
| `sigil-push.svg`, `sigil-pull.svg`, `sigil-core.svg` | Tree sigils (orange, blue, violet; white details, so dark backgrounds only) |
| `placement.svg`, `strain.svg`, `unlock.svg` | Feature icons |
| `og.jpg` | OG card 1200×630 (L-sit on parallettes + "Earn every skill.") |

The front-lever hero was rejected (the pose wasn't a real front lever); it's kept as `hero/hero-front-lever-rejected.png.bak`.
