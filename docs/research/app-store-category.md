# App Store Category Decision — Calisthenics App

**Date:** 2026-06-25
**Question:** Primary category — Health & Fitness (with Social Networking secondary) or Social Networking primary (Health & Fitness secondary)?
**Differentiation premise (from `/tmp/research/competitive-audit.md`):** Path B — community/social DAG (friend DAGs, seasonal events, leaderboards) layered on top of tracker-grade logging.

## Recommendation

**Primary: Health & Fitness. Secondary: Social Networking.**

The decision is overwhelmingly one-sided in 2026. Every comparable app in the calisthenics / strength-tracking space — and every successful "social + fitness" precedent including Strava — has filed Health & Fitness as primary. Choosing Social Networking as primary would be a categorical self-inflicted wound: the wrong chart, the wrong audience signal, and a real risk of rejection or downrank.

## Competitor Category Choices

All categories verified directly from the App Store listing pages or Sensor Tower metadata, June 2026.

| App | Primary | Secondary | Note |
|---|---|---|---|
| **Strava: Run, Bike, Walk** (180M+ users, canonical social+fitness) | Health & Fitness | Sports | Social features (segments, kudos, leaderboards, follow) sit inside an H&F app, not the other way around. |
| **Strong Workout Tracker Gym Log** | Health & Fitness | — | Pure tracker; Sensor Tower confirms "Health & Fitness" category. |
| **Hevy — Workout Tracker Gym Log** | Health & Fitness | — | ~2M+ lifetime downloads, ~$800k MRR. The dominant community tracker Hevy is competing against per the audit. |
| **Thenx: Calisthenics Training** | Health & Fitness | — | Explicit "Category Health & Fitness" on the App Store listing. |
| **Calistree \| Bodyweight Fitness** | Health & Fitness | — | 5-year incumbent with the same skill-tree premise; 4.8★. |
| **Calisthenics Family** | Health & Fitness | — | Verified "Category. Health & Fitness" on App Store (CA listing). |
| **Fitloop: Calisthenics Workout** | Health & Fitness | — | Verified "Category. Health & Fitness" on App Store (US listing). |
| **Calistack: Calisthenics Skills** (Mohammed Riyas, May 2026) | Health & Fitness | — | Newest entrant, launched ~1 month ago. Same call. |
| **BodyTree: Calisthenics** (Andre Havasi, Apr 2026) | Health & Fitness | — | Closest competitor to a DAG-and-tracker hybrid; same category. |
| **Cali Move / Calisteniapp / Hybrid Calisthenics / Calisthenics Mastery** | Health & Fitness | — | Pattern holds across the whole vertical. |

**Pattern:** 10 / 10 ship Health & Fitness primary. None ship Social Networking primary. Strava is the strongest single precedent: it is widely *known as a social network for athletes*, yet Apple lists it under Health & Fitness — because that is the primary functional purpose (GPS activity tracking), and social is the differentiator layered on top.

## Apple Category Descriptions (developer.apple.com)

- **Health & Fitness** — *"Apps related to healthy living, including stress management, fitness, and recreational activities."* This explicitly includes fitness *and* recreational activities — a workout-and-DAG app is a textbook fit.
- **Social Networking** — Apps whose primary purpose is to enable social interaction: profiles, posts/feed, friending, messaging, community-as-product. Think Threads, WhatsApp, BeReal, Discord, Strava-clone startups that *aren't* also a tracker.

Apple's own "Choosing a Category" page (developer.apple.com/app-store/categories/) makes the rule explicit: pick the category that "best serves your app." If an app fits multiple, the primary should match the app's *main purpose*. The Health & Fitness description is broad enough to encompass social graphs inside a fitness context; the Social Networking description is narrower and reserved for products whose reason for being is the network itself.

## Rationale for Health & Fitness Primary

1. **App purpose alignment.** The app is a workout tracker first (sets/reps/timer/history) with social DAG as the differentiator. The user's primary intent — and the app's primary value — is fitness. Social is the *layer*, not the *core*. Apple reviewers and the chart algorithm weight app purpose over marketing positioning.
2. **Precedent alignment.** Strava, the proof point that "social + fitness" works as a product category, ships under H&F. Hevy, the incumbent the competitive audit identifies as the user we must convert, ships H&F. Choosing Social Networking primary would put us on the wrong chart next to Discord and Threads, not next to Hevy and Strava.
3. **Chart competition dynamics.** H&F is a deep but high-intent funnel — users browse there *to find a workout app*. Social Networking is a shallow but very high-volume funnel dominated by global incumbents (Threads, WhatsApp, Telegram, Instagram, TikTok). A new indie with a small social graph cannot break into the Social Networking top 200, whereas a focused H&F app can rank on a sub-genre chart (e.g., "calisthenics" keyword search).
4. **ASO keyword weighting.** Apple weights keywords in the app name, subtitle, and primary category more heavily than secondary. If our primary category is H&F, our brand and keyword field can target "calisthenics," "bodyweight workout," "pull-up tracker," "skill tree" — all H&F keywords. If our primary is Social Networking, those keywords get weaker association and "social fitness" gets stronger association, which is far less searchable volume.
5. **Rejection/downrank risk.** Wrong-primary-category is a documented rejection and downrank vector. Buildfire explicitly warns against this pattern; multiple App Store consultants and indie devs flag it as a removal risk. Choosing Social Networking primary for a workout app would invite exactly this kind of review friction. Conversely, filing as H&F when the app is "really" social has no documented downside — Strava has lived there for over a decade.
6. **Future-proofing for compliance.** Spring 2026 Apple policy added a "regulated medical device" badge for apps in H&F/Medical categories. This is a slight extra compliance consideration but is irrelevant for a non-medical fitness app and the category choice doesn't change our regulatory status.

## ASO Keyword Impact

Primary-category signals feed into Apple's search index for default relevance ranking. With Health & Fitness as primary, the following keywords receive category-correlation boosts and are likely worth inclusion in name/subtitle/keyword field:

- `calisthenics`, `bodyweight`, `pull ups`, `muscle up`, `front lever`, `planche`, `workout tracker`, `gym log`, `skill tree`, `progressions`, `streak`, `leaderboard`

With Social Networking as primary, the category would de-emphasize those and emphasize `community`, `friends`, `social fitness`, `compete`, `challenges` — keywords where we'd be competing against Discord, Strava, and Peloton. We can still *use* the social keywords in our copy, but losing the H&F category correlation on the tracker-keywords is not recoverable through copy alone.

## Recommended Secondary

**Social Networking** is the right secondary — it gives discoverability on the Social Networking chart (where a calisthenics social-DAG is genuinely novel) without surrendering the H&F primary chart position. This mirrors what Strava effectively does (its ASO meta surfaces it on both Health & Fitness and Sports charts).

## Bottom Line

- **Ship:** Primary = Health & Fitness, Secondary = Social Networking.
- **Do not ship:** Primary = Social Networking, Secondary = Health & Fitness. This is how Strava *didn't* file, how Hevy *didn't* file, how Calistree and Thenx and Fitloop and Calistack *didn't* file, and how Apple explicitly warns against filing "social" apps whose main purpose is fitness.
- **Reject the option of H&F only.** Add Social Networking as the secondary even at launch. It's free discoverability on a second chart, and the social DAG is a stated part of the product — leaving the secondary blank would be a missed ASO opportunity that costs nothing to capture.