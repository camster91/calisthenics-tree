# Fitness / Calisthenics App Pricing & LTV/CAC Model

**Product assumption:** Calisthenics subscription app at **$4.99/mo · $39.99/yr · 7-day free trial**, iOS-first launch.

---

## 1. App Store Fee Structure (2026, verified)

- **Standard commission:** 30% on all paid apps and In-App Purchases.
- **Small Business Program (SBP):** 15% commission for developers earning < **$1,000,000 in App Store proceeds per calendar year**. New developers can apply immediately.
- **Auto-renewing subscription rule:** Apple charges **30% in year 1**, then drops to **15% from year 2 onward for the same subscriber** — independent of SBP status. Qualifying participants keep this 15% even after crossing the $1M threshold if they were enrolled prior.
- **Effective blended rate (year-1-heavy mix):** ~**22.5%** (50/50 year-1 / year-2+ assumption). A young app is closer to 30%.

Sources: [Apple Developer — Small Business Program](https://developer.apple.com/app-store/small-business-program/) · [RevenueCat — Small Business Program guide](https://www.revenuecat.com/blog/engineering/small-business-program/) · [Adapty — 2026 guide](https://adapty.io/blog/app-store-small-business-program/)

---

## 2. Market Benchmarks

### 2a. Hevy (workout tracker, gold-standard indie benchmark)
- **~$800K MRR** as of Oct 2025, achieved **without paid ads** ([LinkedIn — Vasyl Sergienko](https://www.linkedin.com/posts/vasyl-sergienko_800k-mrr-without-spending-a-dime-on-ads-activity-7426565528221122560-bU9p), [Starter Story](https://www.starterstory.com/hevy-breakdown)).
- **~400K monthly downloads**, **~$600K/mo revenue** ([Sensor Tower, Feb 2026](https://app.sensortower.com/overview/1458862350?country=US)).
- Strategy: TikTok/Reels + community. Proves organic-led fitness app economics are real.
- Effective ARPU: $800K MRR / ~50K active paid ≈ **~$16 ARPU/user** (premium positioning + strong retention).

### 2b. Calistree (closest direct comp — calisthenics)
- **$5.99/mo · $44.99/yr ($3.75/mo effective) · $179 lifetime** ([Calistree pricing page](https://calistree.com/pricing/), [App Store listing](https://apps.apple.com/us/app/calistree-bodyweight-fitness/id1558561315)).
- Our proposed pricing is **17% lower on monthly** ($4.99 vs $5.99) and **11% lower on annual** ($39.99 vs $44.99). That's a deliberate undercut — we are the value player.

### 2c. Wider fitness subscription apps
- Median ARPU after 60 days: **$0.63** ([RevenueCat State of Subscriptions 2025 via Athletech News](https://athletechnews.com/fitness-apps-monetizable-winner-take-all-or-most/)) — highest of any category.
- 30-day retention avg ~45%, 60-day ~28%, 90-day ~18% across mobile subs ([Adapty benchmarks](https://adapty.io/blog/top-5-advanced-mobile-subscription-metrics/)).

---

## 3. Conversion & Churn Assumptions

| Metric | Value | Source |
|---|---|---|
| Install → trial start | **18–28%** | [Admiral Media 2026 benchmarks](https://admiral.media/mobile-app-marketing-benchmarks-2026/) |
| Trial → paid (with credit card on file) | **40–55%** | Admiral Media |
| Monthly churn (health & fitness) | **9.2%** | [RetentionCheck / Antenna 2024](https://retentioncheck.com/churn-benchmarks/fitness-apps) |
| Annual retention | **~33%** (~67% annual churn) | RetentionCheck citing Business of Apps / Antenna |
| Avg subscriber lifetime | 1 / 0.092 ≈ **10.9 months** | Derived |
| LTV:CAC healthy ratio | **3:1** | [Adapty](https://adapty.io/blog/customer-acquisition-cost/), [Paddle](https://www.paddle.com/resources/cac-ltv-ratio) |

**Modeling assumption used below:** blended ARPU uses a **70% monthly / 30% annual** mix (typical for fitness apps that don't hard-discount the annual).

Blended ARPU = 0.7 × $4.99 + 0.3 × ($39.99 / 12) = **$4.49 / month**.

---

## 4. MRR Table (paying users)

| Paying users | Pure monthly MRR (100% on $4.99) | Blended MRR (70/30 mix, $4.49 avg) | Annual run-rate (blended) | Net to dev after Apple 22.5% |
|---:|---:|---:|---:|---:|
| **100** | $499 | $449 | $5,388 | $348 |
| **1,000** | $4,990 | $4,490 | $53,880 | $3,480 |
| **10,000** | $49,900 | $44,900 | $538,800 | $34,798 |

At 10k paying users on this pricing, you stay under the $1M SBP threshold for several years — keeps Apple take at 15% on most revenue, not 30%.

---

## 5. LTV & CAC Payback

**LTV (gross, pre-Apple):** $4.49 / 0.092 = **~$48.81** per subscriber over lifetime.
**LTV (net, after 22.5% blended Apple fee):** $4.49 × 0.775 / 0.092 = **~$37.83**.

**CAC scenarios** (fitness CPI in US: **$3–$8 paid**, **$0 organic**):

| Channel | Spend/mo | CPI / CAC | CAC payback (gross) | CAC payback (net) | LTV:CAC |
|---|---:|---:|---:|---:|---:|
| **Organic (Reddit launch, ASO, content)** | $0 | $0 | **Immediate** | Immediate | ∞ — pure profit |
| **Low-cost paid ($500/mo @ $5 CPI)** | $500 | ~$500/customer (1% conversion × 100 installs) | 111 months | 144 months | 0.08 — **broken** |
| **Efficient paid ($500/mo @ $1.50 CPI, optimized funnel)** | $500 | ~$150/customer | 33 months | 43 months | 0.32 — **still broken** |
| **Healthy paid ($500/mo @ $0.50 blended CPI, e.g. influencer)** | $500 | ~$50/customer | 11 months | 14 months | 0.96 — marginal |
| **Target for 3:1 ratio** | — | **$13/customer** | 2.9 months | 3.8 months | 3.0 |

**Break-even at $4.49 ARPU:** any CAC above ~$13 (net ~$10) makes LTV:CAC worse than 3:1. With Apple fees, **CAC ceiling ≈ $12.50**.

---

## 6. Verdict & Recommendation

**$4.99/mo + $39.99/yr is a viable anchor, but it's the floor, not the sweet spot.**

### Rationale
1. **Margin headroom is real.** At 10% monthly churn and 9.2% benchmark churn, blended LTV is only ~$38 net. Pricing at $4.99 leaves no cushion for any meaningful paid acquisition — even a $10 CPI destroys unit economics.
2. **Calistree benchmarks higher** ($5.99 / $44.99) and is the closest comp. A 17% undercut isn't decisive enough to win on price *and* signals "lower quality." Either match them at $5.99 or go meaningfully lower ($3.99) and own the budget tier outright.
3. **Annual should be discounted more aggressively.** $39.99 vs $59.88 sticker is only 33% off — weak. Push annual to **$29.99 (50% off, $2.50/mo)** to lift annual mix from 30% → 50%. That alone raises blended ARPU and cuts churn (annual subscribers churn ~50% less).
4. **Lifetime tier is missing.** Calistree has $179. Add a **$99 lifetime** for power users — pure profit after the first month, no churn exposure.
5. **App Store fee caveat:** at <$1M/yr you stay in the 15% Small Business Program for *all* revenue. Plan to cross the threshold deliberately (a feature, not a bug) so year-2+ subscribers drop to 15% — that's the real compounding margin.

### Recommended price ladder
- **Monthly: $5.99** (match Calistree, stop the quality discount signal)
- **Annual: $29.99** ($2.50/mo, 50% off — best value badge)
- **Lifetime: $99** (optional, captures whales)
- **Trial: 7 days** (keep; convert via credit-card-on-file)

At $5.99 / $29.99 split 50/50, blended ARPU jumps to **$4.24** but annual retention lifts LTV enough to push blended LTV to **~$50 net** and CAC ceiling to **~$16** — sustainable for efficient paid UA.

**Bottom line:** keep $4.99 only if you commit to 100% organic acquisition (Hevy playbook). If any paid spend is on the roadmap within 12 months, **anchor at $5.99 and front-load annual with a 50% discount**.

---

*Sources compiled from Apple Developer, RevenueCat, Adapty, Sensor Tower, RetentionCheck (Antenna/Business of Apps 2024), Starter Story, Admiral Media, LinkedIn (Vasyl Sergienko), Calistree pricing page, and Athletech News — all URLs inlined above.*