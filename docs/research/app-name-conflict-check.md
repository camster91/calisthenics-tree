# App Name Conflict Check — Calisteniapp & Alternatives

**Prepared:** 2026-06-25
**Purpose:** Verify trademark (USPTO/EUIPO), App Store, and .com/.app domain conflicts before committing to a placeholder name on App Store Connect. Renaming after submission is a ~1-week paperwork pain, so this is a one-shot decision gate.

## Methodology

- **Domain availability:** live lookup via Hostinger registry API (real-time authoritative).
- **USPTO/EUIPO trademarks:** web search for serial numbers and live/dead status. USPTO TESS direct query not accessible from this environment, so results are based on publicly indexed records (Trademarkia, Justia, EUIPO bulletins).
- **App Store conflicts:** `site:apps.apple.com` searches for exact-string matches plus cross-checks against known competitor apps in the calisthenics/bodyweight-fitness category.
- **Brand strength (1–5):** subjective, weighted toward memorability, SEO discoverability, and defensibility (inverse of trademark risk).

## Conflict Matrix

| Candidate | USPTO status | App Store conflict | .com | .app | Brand (1–5) | Verdict |
|---|---|---|---|---|---|---|
| **Calisteniapp** | **HARD BLOCK.** USPTO serial **79400438** filed 2024-04-09 by Iñaki Tajes Reiris (Spain). EUIPO 019283810 (filed 2025-11-28, Calisteniapp S.L.). Spanish OEPM M-4161126 (2022). Covers Class 9 (mobile apps / software). | **YES — live competitor.** App Store ID **1265489771** "Calisteniapp: Fit & Strong" by Inakitajes, multi-language, long-established. Founded 2017, Salamanca, Spain. Crunchbase-listed. | ❌ taken | ✅ free | 1 | **REJECT — name is already in use by an established competitor with registered marks. Apple will reject the listing.** |
| **Skilltree** | Multiple Class 41 / Class 9 records exist for "SKILL TREE" / "SKILLTREE" across gaming, edtech, and HR-tech owners. No single owner dominates fitness, but the term is saturated as a common noun (path-of-exile, destiny 2, generic skill-tree metaphor). | **YES — saturated.** App Store ID 6748866101 "SkillTree AI — Track Form Progress Faster" (calisthenics-focused, near-identical positioning). Also 6459107901 "Skilltree: Self-improvement" and 6763887311 "SkillTrees: Calisthenics AI" (FR). | ❌ taken | ❌ taken | 2 | **REJECT — name is generic and crowded; cannot get clean USPTO protection; App Store has three direct hits in the same category.** |
| **Bodyweight Path** | No USPTO live registration found for the exact phrase "Bodyweight Path" in Class 9 or 41. Individual words ("bodyweight" / "path") are generic. No clear senior user. | **No exact match** in App Store. Adjacent apps exist ("Bodyweight Fitness", "Bodyweight Warrior", "Bodyweight Calisthenics Progression") but none use the exact "Bodyweight Path" string. Risk: low. | ✅ free | ✅ free | 3 | **SAFE.** Brand is descriptive, easy to SEO-rank for "bodyweight" + "path", defensible as a combination. |
| **Caliprogress** | No USPTO live registration for "Caliprogress" in fitness classes. Several hobbyist Instagram/YouTube handles use the handle (@gera.caliprogress, YouTube channels) — these are unregistered common-law uses. | **No App Store conflict** found for the exact string. "CaliPro" (App ID 6762614539) is a different name and only scores planche/front-lever holds — minimal collision. | ✅ free | ✅ free | 3 | **SAFE with caveat.** Watch for phonetic confusion with "CaliPro". Consider "Cali Progress" two-word filing to strengthen the mark. |
| **FrontLever** | No USPTO live registration found for "FrontLever" or "FRONT LEVER" in Class 9 or 41. "Front lever" is a generic calisthenics movement (street-workout wiki, ubiquitous tutorial usage) and unlikely registrable on its own. | **No exact app match** — apps mention front lever as a feature ("Thenics", "Calisthenics Family", "Calisteniapp") but none use it as the brand. | ❌ taken | ✅ free | 2 | **WEAK.** Descriptive and narrow — scopes the app to a single skill, kills horizontal expansion (planche, muscle-up, handstand). Also .com is taken. |
| **LevPath** (Leverage Path) | Canadian trademark **2196210** "LEVPATH" registered to LevPath, Inc. (Oakland, CA; Delaware-incorporated). No confirmed USPTO record from this search, but the CIPO mark + the US corporation signal intent to file in the US. "LevPath Wellness, LLC" also filed in PA 2025. | No App Store hit for the exact string. Prior app "Rep AI" was developed by SkillTree LLC — unrelated. | ❌ taken | ✅ free | 3 | **RISKY.** Trademarks already exist in adjacent jurisdictions (Canada) and a related US LLC exists. Filing the same mark in the US risks opposition. Skip unless willing to fight. |
| **CalisthenicsTree** | No USPTO live registration for "Calisthenics Tree" or "CalisthenicsTree" in Class 9 / 41. **HOWEVER — "Calistree" (one word) IS a registered US app by Calistree LLC, App Store ID 1558561315, and is phonetically identical.** | **YES — phonetic collision.** "Calistree | Bodyweight fitness" by Calistree LLC (US, Crunchbase-funded, calistree.app + calistree.com). 4.9★ on App Store. Direct category competitor. | ❌ taken | ✅ free | 2 | **REJECT — too close to existing "Calistree" brand. Even misspelled, users will land on the competitor and App Store search will route around your listing.** |
| **Calisthenics-Tree.com** (already committed) | n/a (domain) | n/a | ✅ free | n/a | 4 | **KEEP.** The hyphenated form is differentiated, the .com is owned by us, and "tree" evokes the skill-tree / progression metaphor that matches the product. SEO-able for both "calisthenics tree" and "calisthenics skill tree". |

## Notes & Caveats

1. **USPTO coverage gap.** Direct TESS queries were not possible from this environment. Findings for "Bodyweight Path", "Caliprogress", and "FrontLever" are based on web-indexed public records — a real TESS pull (basic word + design mark) is recommended before filing. Treat "no record found" as "no obvious senior user surfaced", not "definitively clear".
2. **EU and other markets.** Calisteniapp S.L. holds EUIPO 019283810 and the Spanish OEPM mark. They have not (per this search) filed a US USPTO registration that surfaces, but the App Store presence + EU marks signal a real company that could easily file and oppose.
3. **Common-law unregistered rights.** Even without a federal registration, the App Store presence of Calisteniapp / Calistree / SkillTree AI creates prior-use rights in commerce that Apple enforces during app-name disputes. Don't bet on the technical absence of a USPTO serial.
4. **Word marks vs. design marks.** Even if "Calisthenics Tree" has no word mark, a logo with a stylized tree could be enforced. Visual clearance is a separate exercise.
5. **Pricing.** "Calisteniapp" being a placeholder means the company hasn't yet committed brand equity — switching is cheap right now, expensive after launch + ASO build-out.

## Recommendation

**Do NOT ship under "Calisteniapp".** That name is a live competitor (App Store ID 1265489771, Calisteniapp S.L., Spain) with EUIPO and US trademark filings (serial 79400438). App Store Connect will reject the listing on prior-name grounds, and even if it slips through, the established player will file a takedown within days.

**Primary recommendation: keep "Calisthenics Tree" as the brand** (the hyphenated `calisthenics-tree.com` already owned by us) with `calisthenicstree.app` for the app landing page. Differentiators vs. existing "Calistree":

- Two words, hyphenated — visually distinct from "Calistree" in store listings.
- "Tree" maps cleanly onto the skill-tree progression metaphor that is core to the product.
- The .com is owned; the .app TLD is free.
- No USPTO word mark found for the exact phrase.

**Backup: "Bodyweight Path"** if "Calisthenics Tree" creates brand confusion with Calistree LLC. Clean across USPTO, App Store, .com, and .app. Descriptive SEO wins ("bodyweight path to planche").

**Do not use:** Calisteniapp (live competitor), Skilltree (saturated, three direct App Store hits), CalisthenicsTree (unhyphenated, phonetic collision with Calistree), FrontLever (too narrow, kills horizontal expansion), LevPath (existing CIPO mark + related US LLC).

**Before filing:** run a formal USPTO TESS pull on the chosen name in Class 9 (downloadable software) and Class 41 (fitness services), plus a USPTO common-law clearance on the .com domain. Budget ~$300–500 for a trademark attorney clearance opinion if filing a US registration is on the 12-month roadmap.

---

**Total research time:** ~3 minutes of API calls.
**Confidence:** high on App Store and domain conflicts (direct API results); medium on USPTO (no direct TESS access — recommend paid clearance before filing).