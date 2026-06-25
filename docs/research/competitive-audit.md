# Competitive Audit: DAG / Skill-Tree Progression in Calisthenics Apps

**Date:** 2026-06-25
**Question:** Does the DAG-based progression premise still have a moat, or is it already shipped?

## TL;DR

The DAG/skill-tree model is **not a moat in 2026 — it is already a crowded, commoditized category.** At least six shipped iOS/Android apps advertise branching skill trees with unlock mechanics. No incumbent has cracked the full DAG vision, but the *idea* itself is no longer defensible. The remaining moat, if any, lives in execution (tracker-grade logging + richer DAG), not in the model.

## Competitor inventory

| App | DAG / skill-tree mechanic | Platforms | Pricing |
|---|---|---|---|
| **Calistree** | "Skill trees for step-by-step progress" — exercises organized in trees by skill family | iOS + Android | $5.99/mo, $44.99/yr ($3.75/mo), $179 lifetime |
| **BodyTree** (Andre Havasi, launched Apr 2026) | "Maps 242 exercises across 32 skill branches into a visual skill tree. Each exercise unlocks [the next]" | iOS (Android "coming soon") | TBD |
| **Calistack** (Mohammed Riyas, Jun 2026) | "The only calisthenics app built around a structured skill tree… unlocks your next move when…" | iOS + Android | TBD |
| **Thenics** (Innothenics GmbH) | "Step-by-step progressions… visual skill tree to provide clear advancement paths" | iOS + Android + Web | Free + IAP for plans/skills |
| **Fitloop** | "Maps your path from beginner to advanced through structured skill trees" | iOS + Android | $5.99/mo, $39.99/yr |
| **Calisthenics Family** | "Personalized skill boards," 50+ training plans | iOS + Android | from €59.99 / 3 months |
| **calitree.app** (web) | "Interactive skill tree that turns real-world calisthenics progressions into an explorable, achievement-based experience. Unlock skills by passing tests" | Web only | Unknown |
| **Calisthenics Skills** (2020 Reddit indie) | "120+ skills laid out in bite-sized trees" | Web | Free |

Plus a December 2025 indie web build ("maps out calisthenics skills like a video game skill tree, no AI slop, no subscription bs") with users in the comments asking for an app version. The idea has been independently built **at least eight times in five years.**

Notable non-DAG apps still in the conversation: **Hevy** (linear rep/set logger, the dominant community tracker), **Strong**, **Thenx** (skill progressions, but presented as linear workout programs), **Calisteniapp** (program-based, €9.99/mo), **Simple Calisthenics** ($9.99/mo, $89.99 lifetime), **Calisthenics Mastery**, **Hybrid Calisthenics** (free), **Calisthenic Movement**.

## DAG coverage verdict

Yes, graph/branching progression exists. But the implementations vary in depth:

- **Calistree's trees** are *browsing aids* organized by skill family (push, pull, core, static holds). Users describe them as a discovery UX, not a dependency graph.
- **BodyTree** (newest, Apr 2026) explicitly markets "32 skill branches" with unlock-by-test semantics — closest to a DAG.
- **Calistack** (Jun 2026) markets "unlocks your next move when…" — also DAG-shaped.
- **Thenics** and **Fitloop** use the term "skill tree" but their actual mechanics are closer to *sequential program steps* than a branching graph.

No app surfaced that explicitly markets a multi-parent DAG (a skill unlockable via two different progressions), achievement chains, or cycle-detection in the progression graph. The "true DAG" vision appears unoccupied, but the label "skill tree" is taken.

## Community tracking habits

The Reddit calisthenics community (r/bodyweightfitness has ~1.4M members) splits three ways:

1. **Hevy with custom exercises** — the dominant pattern. Users add the calisthenics skill (e.g. tuck front lever) as a custom exercise, log sets/reps, and use Hevy's note field to record progression variants. Hevy is *not* a skill-tree app.
2. **Niche calisthenics apps** — Calistree gets recurring recommendations; Calisthenics Family has its fans; Thenx for beginners.
3. **Notes / Google Sheets** — still common. A current BWF moderator recently posted: "I still track everything in Notes / Google Sheets. I'm building a simple app for it."

The repeated complaint pattern across Reddit threads and App Store reviews: *"I want to see what skill comes next, and the app should tell me I'm ready."* This is exactly the DAG premise — and it's the most-requested missing feature in Hevy reviews.

## Pricing benchmarks (sub-$10/mo)

- Calistree: $5.99/mo, $44.99/yr, $179 lifetime
- Fitloop: $5.99/mo, $39.99/yr
- Calisteniapp: €9.99/mo, €69.99/yr
- Simple Calisthenics: $9.99/mo, $24.99/3mo, $69.99/yr, $89.99 lifetime
- Thenx: ~$9.99/mo region-dependent
- Calisthenics Family: from €59.99 / 3 months

Public MRR / download benchmarks:
- **Hevy**: ~$800k MRR, ~400k downloads/month, ~2M+ lifetime downloads (Sensor Tower overview; LinkedIn post by Vasyl Sergienko Feb 2026; RevenueCat 2023 case study)
- **Calistree / Calistack / BodyTree / Thenics / Fitloop**: no public MRR or download numbers found. All appear to be sub-1M-download indie products. None has hit Sensor Tower's public top-grossing fitness tier.

## Moat assessment

**The DAG model is not a moat.** It is a category that exists, has shipped, and is being entered by 2–3 new indie apps per year (Calistack and BodyTree both launched Q2 2026). A new entrant whose *only* differentiator is "we have a DAG" will be one of seven.

**What is still unoccupied:** a *tracker-first* product that combines Hevy-quality logging (sets/reps/rest timer/exercise swap/history graphs) with a real DAG (multi-parent unlocks, dependency edges, achievement chains, possibly social proof of unlocks). Hevy users retrofit the progression; existing tree apps don't track well. That gap is real but narrow.

**Risk factors:**
1. Three new skill-tree apps shipped in 2026 (BodyTree, Calistack, Calistree's "5.3 pre-made routines" update). The space is getting crowded fast.
2. Calistree has a 5-year head start, 1,300+ exercises, a dedicated subreddit, and a 4.5+ star average.
3. The actual user habit is still fragmented; whoever wins will need to convert Hevy users or Notes/Sheets users, not the existing skill-tree apps' users (too small to matter).

**Verdict:** Treat DAG as a *requirement*, not a *differentiator*. The differentiator has to live in an adjacent axis: tracking depth (Hevy parity), content quality (Thenx-caliber coaching video per node), social/community mechanics, or richer gamification (achievement chains, seasonal skill events, friend DAGs). Without one of those, this is a "feature parity in a 7-app category" play.

**Recommendation for the plan:** Drop any claim that "DAG progression" is unique or defensible. Reposition the differentiator around one of: (a) tracker-grade logging + DAG, (b) community/social DAG, or (c) coaching-video-per-node. Validate which of those the target user actually pays for before building.