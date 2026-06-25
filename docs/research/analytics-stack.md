# Analytics Stack Recommendation: PostHog vs Mixpanel vs Amplitude

**Context:** Solo-founder fitness app, hobby budget, scaling to ~100k MAU. Need: onboarding funnel, D1/D7/D30 retention, friend-invite viral loop, subscription funnel, workout completion. Event volume ~1M/month.

## Candidate overview

- **PostHog** — All-in-one product platform. Analytics, funnels, retention, session replay, feature flags, A/B tests, surveys, error tracking, all from one SDK. Self-hostable (open source, MIT/PostHog Cloud). Cloud free tier generous across **every** product. (https://posthog.com/pricing)
- **Mixpanel** — Pure quantitative product analytics (events, funnels, retention, cohorts). Session Replay added in 2024 and now on the Free plan. Reintroduced A/B tests + feature flags in late 2025. (https://mixpanel.com/pricing/, https://docs.mixpanel.com/changelogs)
- **Amplitude** — Cohort- and retention-focused analytics. Strongest at behavioural cohorts and stickiness. Session Replay included in the free Starter plan since 2025. (https://amplitude.com/pricing)

## Free tier limits (verified)

| Tool | Free events/mo | Free replays/mo | Free feature flags | What triggers billing | Source |
|---|---|---|---|---|---|
| **PostHog** | 1M | 5K | 1M requests/mo | Per-product usage over its free allowance; billing limits per product (no surprise bills) | https://posthog.com/pricing, https://dev.to/beton/posthog-pricing-teardown-2026-57oo |
| **Mixpanel** | 1M | 10K | Limited (relaunched 2025) | Overages are **event-based** (Mixpanel moved from MTU to event-based billing in Feb 2026); ~$0.28 per 1K additional events | https://mixpanel.com/pricing/, https://costbench.com/software/developer-tools/mixpanel/, https://apiscout.dev/guides/mixpanel-vs-posthog-vs-amplitude-api-2026 |
| **Amplitude** | 2M (with 10K MTU cap) | ~1K (1-month retention) | Unlimited | Dual model: MTU **and** event count — exceed either and you pay 1.2× overage | https://amplitude.com/pricing, https://quackback.io/blog/amplitude-pricing, https://agentdeals.dev/vendor/amplitude |

**Important correction to the brief:** Mixpanel's free tier was reduced from 20M to **1M events/month in late 2025**, not 20M (https://apiscout.dev/guides/mixpanel-vs-posthog-vs-amplitude-api-2026). All three vendors now live in roughly the same 1–2M event free band; the differentiator is what is *included*, not the headline number.

## Feature matrix for our 5 use cases

| Use case | PostHog | Mixpanel | Amplitude |
|---|---|---|---|
| **Onboarding funnel** | Funnels + trends (visual builder, ~15 min to first funnel) | Funnels (its historical strength, fast UI) | Funnels (good but cohort-style, slightly heavier) |
| **D1/D7/D30 retention** | Retention table + stickiness graphs | Retention reports, very fast | **Strongest** — retention/cohorts are Amplitude's identity |
| **Friend-invite viral loop** | Funnels + correlation + feature flags to gate invite flow | Funnels + cohorts | Cohorts + behavioural analysis |
| **Subscription funnel** | Funnels + session replay to find paywall drop-off | Funnels (excellent at e-commerce flows) | Funnels + cohort LTV |
| **Workout completion** | Custom events + trends + session replay to see UX | Custom events + trends | Custom events + cohorts |
| **Session replay** | ✅ 5K free/mo, rage-click detection, sensitive-data masking | ✅ 10K free/mo (since 2024, on Free plan) | ✅ ~1K free/mo, 1-month retention only |
| **Feature flags** | ✅ Included free, tied to analytics for A/B rollouts | ✅ Relaunched 2025, limited on free | ✅ Unlimited on free |

**Time to first useful insight:** All three let you build an onboarding funnel in under 30 minutes via SDK snippet + visual builder. PostHog's docs are slightly more verbose ("flexible but takes time to design events properly" — Mixpanel's own review notes, https://mixpanel.com/blog/amplitude-alternatives/); Mixpanel's UI is the snappiest for first-pass funnel work. Amplitude's retention is the fastest of the three *if* retention is your primary question.

## Self-hosting PostHog (is it worth it?)

- **Min spec:** 4GB RAM recommended (2GB absolute minimum) on a single Docker host or Kubernetes via the official Helm chart. (https://posthog.com/docs/self-host, https://github.com/PostHog/posthog)
- **Cheapest viable host:** Hetzner CX22 — $4.59/mo, 2 vCPU / 4GB RAM / 40GB NVMe. (https://www.birjob.com/blog/self-hosting-renaissance-2026)
- **Realistic setup time:** 2–3 hours for the `docker compose` hobby deploy if you know Docker; 4–8 hours for someone doing it for the first time (DNS, TLS, backups, upgrades, ClickHouse tuning). Not a weekend-killer, but it is recurring-ops overhead.
- **Worth it?** Only if (a) data-residency is a hard requirement, or (b) you'll consistently exceed the 1M-event free tier and the savings beat the ops cost. At 1M events/mo you pay **$0 on PostHog Cloud** — self-hosting to save $0 is a bad trade. The "save money by self-hosting" argument kicks in around 5–10M events/mo.

## Cost projections at scale

Assuming ~10 events per MAU per month (typical for a fitness app with workout logging, social, and subscription events):

| MAU | Events/mo | PostHog Cloud | Mixpanel | Amplitude |
|---|---|---|---|---|
| **1k** | ~10k | $0 (free) | $0 (free) | $0 (free) |
| **10k** | ~100k | $0 (free) | $0 (free) | $0 (free) |
| **100k** | ~1M | $0 (free, exactly at cap) | $0 (free, exactly at cap) | $0 (free if ≤10K MTU *and* ≤2M events) |

At 100k MAU, **all three stay free if your 10× events/user estimate holds and you stay under Amplitude's 10K MTU cap** (Amplitude's MTU cap is the hidden gotcha — you can be way under event volume and still pay once you exceed 10k tracked users/mo). PostHog is the safest bet at 100k MAU because it bills on events, not MTUs.

**If the app goes viral and you cross 5M events/mo:**
- PostHog Cloud: ~$0.00031/event over 1M = **~$1,240/mo** (https://posthog.com/pricing)
- Mixpanel Growth: ~$0.28 per 1K = **~$1,120/mo** (https://www.stackfyi.com/guides/amplitude-vs-mixpanel-vs-posthog-2026)
- Amplitude Plus: starts at $49/mo + MTU overage at 1.2× — typically **$1,500–2,000/mo** at 5M events / 50k MTU (https://quackback.io/blog/amplitude-pricing)

PostHog and Mixpanel are roughly tied at scale; Amplitude is consistently the most expensive. (https://prettyinsights.com/amplitude-review/)

## Recommendation: **PostHog Cloud** ✅

**Why PostHog, not the other two:**

1. **The brief requires funnels + retention + session replay — PostHog gives you all three plus feature flags in a single SDK with one free tier covering all of them.** Mixpanel is a strong analytics tool but adds replay relatively recently; Amplitude is strong on retention/ cohorts but charges for MTUs you didn't ask to track.
2. **No surprise bill at 100k MAU.** PostHog bills on event volume and has per-product billing limits; Amplitude's dual MTU+event model and 1.2× overage multiplier is the most likely to produce an unpleasant invoice when the app takes off. (https://quackback.io/blog/amplitude-pricing)
3. **Time-to-first-insight is competitive.** All three clear the <30 min onboarding-funnel bar, and PostHog's visual builder plus rage-click / sensitive-data masking on replays pays off when you start debugging the workout-completion drop-off.
4. **The "fitness app at 100k MAU" profile is exactly PostHog's sweet spot** — event-heavy, mobile or web, solo or small team, need to iterate fast on funnels without paying Mixpanel/Amplitude prices. (https://pikvue.com/posthog-review-2026-open-source-product-analytics-for-indie-saas-founders/)
5. **Feature flags come free.** If you want to A/B test a new onboarding screen or a paywall price point, you don't need to bolt on a second vendor (LaunchDarkly, Statsig). That's real money and real integration work saved.
6. **Self-hosting is a future option, not a launch requirement.** Stay on Cloud free tier for ~$0/month through 100k MAU. Revisit self-hosting only if/when event volume justifies the ops overhead or data-residency becomes a real constraint.

**When to revisit:**
- If retention/cohort analysis becomes your #1 question and you stop caring about replay: consider Amplitude (its retention tooling is best-in-class).
- If you outgrow PostHog's analytics depth and need a dedicated quantitative analytics tool: consider Mixpanel, but budget for replay + flags as separate costs.
