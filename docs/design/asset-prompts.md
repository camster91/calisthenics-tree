# Calisthenics Tree — Custom Visual Asset Prompt Library

Status: Planned for later implementation
Last updated: 2026-09-28

This document captures the visual asset system and prompt library for the V3 product experience. It is intentionally a planning source for later asset-generation and implementation work.

## Master art direction

Create a premium fitness-app visual asset for a calisthenics training app. The visual style should feel modern, bold, energetic, and polished, inspired by the premium feel of Apple Fitness, but not copying Apple’s UI, branding, layouts, or proprietary assets. Use a deep black background or transparent background depending on the asset type. Use vivid accent colours with clean gradients, subtle glow, soft glass-like highlights, and high contrast. The design should feel athletic, minimal, motivating, and high-end. Shapes should be clean, slightly rounded, and app-friendly. Keep visuals readable at mobile size. Avoid clutter, avoid photorealism unless specifically requested, avoid stock-photo feel, and avoid generic gym clipart.

## Core visual system

### Colour roles
- Push / strength: energetic orange `#FF6B1A`
- Pull: electric blue `#64D2FF`
- Core: violet `#BF5AF2`
- Legs: green `#30D158`
- Caution / modification: yellow `#FFD60A`
- Background: black / near-black `#000000`, `#08080A`, `#0A0A0C`
- Neutral support: white with opacity, graphite greys

### Illustration style
- Premium vector or vector-like rendering
- Smooth gradients
- Simplified athletic human forms
- Clean silhouettes
- Strong gesture and movement
- No childish/cartoon treatment
- No heavy outlines unless intentional
- Subtle glow/light bloom permitted

### Typography feel for text-bearing assets
- Premium fitness-app hierarchy
- Bold display typography
- Clean sans-serif supporting text
- Compact labels
- Tabular figures for metrics

### Export logic
Use SVG for:
- Icons
- Sigils
- Abstract graphics
- Simple illustrations
- Node states
- Equipment icons
- Progress graphics
- Badges

Use PNG for:
- Hero illustrations
- Rich workout scenes
- Celebration visuals
- Onboarding art
- Plan-reveal art
- Empty states
- Milestone cards
- Detailed movement panels

Prefer transparent backgrounds for reusable UI assets.

## Asset production list

### A. Onboarding
1. Onboarding hero
2. Goal selection art set
3. Equipment selection art set
4. Plan-building/loading graphic

### B. Today / Plan
5. Today hero illustration
6. Plan reveal hero graphic
7. Adjust-today icons
8. Readiness / recovery mini visual

### C. Exercise / Workout
9. Exercise illustration system
10. Workout-complete celebration graphic
11. Technique-cue visual accents
12. Rest/timer visuals

### D. Skills
13. Skill sigils
14. Skill-family header art
15. Node-state graphics
16. Unlock badge graphics

### E. Progress
17. Streak flame graphic
18. Consistency ring/orbit
19. Milestone celebration cards
20. Empty states / no-data visuals

## Prompt library

### Onboarding hero
**Format:** PNG  
**Background:** Transparent

> Create a premium hero illustration for a calisthenics mobile app onboarding screen. Show an athletic, gender-neutral human figure in a dynamic training pose that suggests bodyweight fitness, progression, and confidence. Surround the figure with subtle abstract fitness elements such as glowing bars, soft gradient energy arcs, minimal geometric progress lines, and layered motion shapes. The style should feel like a premium dark fitness app: deep blacks, energetic orange, electric blue, violet, and green accents, soft glow, sleek gradients, and modern athletic polish. The composition should be vertical and compact enough for a mobile hero section. The figure should feel strong and aspirational but not exaggerated like a comic superhero. Keep the image clean, visually striking, and app-friendly. Transparent background.

### Goal icon set
**Format:** SVG  
**Background:** Transparent

Master:
> Create a premium vector icon for a dark fitness app. The icon should be designed for mobile UI, with clean geometry, slightly rounded forms, subtle gradient colour, and strong readability at small sizes. Use a premium athletic style, not generic clipart. Transparent background.

Strength:
> Create a premium vector fitness icon representing strength. Use a stylized abstract bodyweight bar or power symbol, with orange gradient accents, clean rounded geometry, subtle glow detail, and strong readability at mobile size. Transparent background.

Muscle:
> Create a premium vector fitness icon representing muscle building. Use a stylized abstract flex or hypertrophy symbol, with orange-to-violet gradient accents, clean geometry, subtle glow, and app-quality polish. Transparent background.

Skills:
> Create a premium vector fitness icon representing calisthenics skills. Use a stylized abstract balance/control symbol inspired by handstand and body control, with blue-to-violet gradient accents, clean geometry, and high-end app polish. Transparent background.

Fitness:
> Create a premium vector fitness icon representing general fitness and conditioning. Use a stylized motion or endurance symbol with green and blue accents, clean geometry, and mobile-app polish. Transparent background.

Balanced:
> Create a premium vector fitness icon representing balanced training. Use a stylized star, orbit, or integrated symbol suggesting all-around development, with orange, yellow, blue, and violet accents, clean geometry, and premium app polish. Transparent background.

### Equipment icon set
**Format:** SVG

Base:
> Create a premium vector equipment icon for a dark fitness app representing [EQUIPMENT]. Use clean geometry, slight rounding, minimal but recognizable detail, high contrast, and subtle accent highlights. Transparent background. Keep the icon visually consistent with other premium app UI icons.

Equipment:
- Bodyweight only
- Pull-up bar
- Bands
- Parallettes
- Rings
- Weights

### Plan-building/loading graphic
**Format:** SVG or PNG

> Create a premium loading graphic for a calisthenics app screen titled “Building your plan.” The visual should show abstract progression logic: connected nodes, circular paths, glowing motion lines, and subtle fitness cues suggesting the app is generating a personalized training plan. Use orange, blue, violet, and green accent colours on a dark visual system. The graphic should feel polished, futuristic, and athletic, but still clean and minimal enough for a mobile app. Transparent background.

### Plan reveal hero
**Format:** PNG

> Create a premium celebratory hero illustration for a calisthenics app plan reveal screen. The image should communicate that a personalized training plan has been created. Show an abstract high-end composition featuring a confident athletic figure, layered circular progress rings, glowing path lines, and symbolic fitness elements representing push, pull, core, and legs. Use a dark premium fitness-app aesthetic with orange, blue, violet, green, and yellow accents. The composition should feel exciting, polished, and motivating, suitable for a mobile screen hero. Transparent background.

### Today hero illustration
**Format:** PNG

> Create a premium hero illustration for a mobile workout card in a calisthenics app. The scene should focus on a bodyweight training movement and feel dynamic, motivating, and clean. Use a dark premium fitness-app style with layered glow, subtle grid texture, orange as the dominant accent, and supporting blue/violet highlights. The composition should be compact and suitable for a mobile card. Keep the figure simplified and stylish rather than photorealistic. Transparent background.

Variants:
- Push session
- Pull session
- Upper body + core
- Legs + skill practice
- Full body foundations

### Exercise illustration system
**Format:** SVG for simple cards, PNG for richer feature cards

Master:
> Create a premium exercise illustration for a calisthenics mobile app. Show a simplified athletic human figure demonstrating [EXERCISE NAME] with correct body positioning. The style should be modern, clean, premium, and app-friendly, with a dark background or transparent background depending on asset use. Use subtle motion accents, gradient lighting, and a category accent colour. The figure should be easy to read at mobile size, with clear limb positions and strong posture. Avoid photorealism, avoid clutter, avoid gym stock-photo style, avoid childish illustration. Emphasize clarity, movement, and polished fitness-app quality.

Category accents:
- Push = orange
- Pull = blue
- Core = violet
- Legs = green
- Skill strength = yellow/orange

Initial exercise list:
- Incline push-up
- Push-up
- Pike push-up
- Active hang
- Scap pull
- Hollow-body hold
- Reverse lunge
- Split squat
- Box pistol squat
- Wall handstand hold
- Tuck front lever
- Dead bug
- Dragon flag negative

Incline push-up:
> Create a premium exercise illustration for a calisthenics mobile app showing a simplified athletic figure performing an incline push-up against a box or bench. Emphasize straight body alignment, clean arm position, and controlled movement. Use orange as the primary accent colour, with a premium dark fitness-app style, subtle glow, and mobile-friendly clarity. Transparent background.

Active hang:
> Create a premium exercise illustration for a calisthenics mobile app showing a simplified athletic figure performing an active hang on a pull-up bar. Emphasize long arms, active shoulders, and stable core position. Use electric blue as the primary accent colour, premium dark fitness-app styling, and high readability at mobile size. Transparent background.

Hollow-body hold:
> Create a premium exercise illustration for a calisthenics mobile app showing a simplified athletic figure performing a hollow-body hold. Emphasize lower-back control, hollow body shape, and clean silhouette. Use violet as the primary accent, with subtle glow and a premium app illustration style. Transparent background.

### Skill sigils
**Format:** SVG  
**Background:** Transparent

Master:
> Create a premium symbolic sigil for a calisthenics skill inside a mobile fitness app. The sigil should feel elegant, minimal, athletic, and high-end, using clean geometry, circular forms, slight symmetry, and subtle glow. It should hint at the movement category without becoming literal clipart. Use a dark-fitness-app visual language with the assigned accent colour. Transparent background.

Handstand:
> Create a premium symbolic sigil for Handstand. It should evoke vertical balance, inversion, control, and shoulder strength. Use orange accents, circular and axial geometry, and subtle premium glow. Transparent background.

Front Lever:
> Create a premium symbolic sigil for Front Lever. It should evoke horizontal tension, pulling strength, and bodyline control. Use electric blue accents and clean geometric structure. Transparent background.

Dragon Flag:
> Create a premium symbolic sigil for Dragon Flag. It should evoke core tension, anti-extension strength, and dramatic control. Use violet accents with a bold but elegant geometric form. Transparent background.

Pistol Squat:
> Create a premium symbolic sigil for Pistol Squat. It should evoke single-leg strength, balance, and stability. Use green accents with clean circular structure and premium app polish. Transparent background.

Future:
- Planche
- Pull-up ladder

### Skill-family header art
**Format:** PNG

> Create a premium header illustration for a calisthenics skill page in a mobile app. The skill is [SKILL NAME]. Show an abstract athletic visual that communicates progression, control, and mastery without becoming a literal poster. Include subtle node-path motifs, gradient energy shapes, and a strong colour identity tied to the skill. Use a premium dark fitness-app style with high contrast and elegant motion. Transparent background.

### Node state graphics
**Format:** SVG

Locked:
> Create a premium vector UI node graphic for a calisthenics skill tree in the locked state. It should feel clean, minimal, slightly muted, and premium, with dark surfaces, subtle borders, and low-intensity glow. Transparent background.

Current:
> Create a premium vector UI node graphic for a calisthenics skill tree in the current active training state. It should feel highlighted, energetic, and important, with a bright accent ring, subtle glow, and high-end app polish. Transparent background.

Completed:
> Create a premium vector UI node graphic for a calisthenics skill tree in the completed state. Use a success indicator, elegant confirmation styling, and clean premium geometry. Transparent background.

Elite / milestone:
> Create a premium vector UI node graphic for a calisthenics skill tree in a special unlocked or milestone state. Use a more celebratory premium glow and stronger contrast while staying clean and app-friendly. Transparent background.

### Unlock / milestone badge system
**Format:** SVG or PNG

Master:
> Create a premium milestone badge for a calisthenics fitness app. The badge should feel rewarding, polished, and athletic, with high contrast, strong shape language, subtle glow, and a dark premium fitness-app aesthetic. The badge should clearly communicate [MILESTONE]. Transparent background.

Milestones:
- First week complete
- New skill unlocked
- 5 workout streak
- 10 workout streak
- New level reached
- Consistency milestone

New skill unlocked:
> Create a premium milestone badge for a calisthenics app representing “New skill unlocked.” Use a dark premium visual style with orange, blue, and violet accents, subtle glow, clean geometry, and a celebratory but restrained feel. Transparent background.

### Workout-complete celebration
**Format:** PNG

> Create a premium celebration illustration for a completed workout screen in a calisthenics app. The image should feel rewarding, motivating, and athletic. Use a dark premium fitness-app style with green, blue, and orange glow accents, abstract progress rings, and a sense of achievement. Include subtle symbolic elements like a check, a ring, energy arcs, or progression motifs, but keep the composition elegant and not childish. Transparent background.

### Streak graphic
**Format:** SVG or PNG

> Create a premium streak graphic for a calisthenics mobile app. The graphic should centre on momentum and consistency, using a refined flame or energy form, strong shape language, and a dark premium visual style with orange highlights. Keep it clean, bold, and readable at mobile size. Transparent background.

### Consistency ring / orbit
**Format:** SVG

> Create a premium circular progress orbit graphic for a mobile fitness app, designed to show training consistency over time. Use a clean ring/orbit style with subtle segmented detail, glow, and a premium dark-fitness aesthetic. Use green as the primary accent with supporting blue and orange highlights. Transparent background.

### Recovery / readiness visual
**Format:** SVG

> Create a premium readiness/recovery visual for a mobile fitness app. Use a compact abstract graphic that suggests freshness, recovery, balance, and training readiness. Use green and blue accents, clean circular or pulse-like forms, and polished app-quality styling. Transparent background.

### Empty states
**Format:** PNG or SVG

No workouts yet:
> Create a premium empty-state illustration for a calisthenics app showing that the user has not completed any workouts yet. The visual should feel motivating rather than disappointing, using a premium dark-fitness aesthetic, subtle progress cues, and a simple athletic figure or abstract training motif. Transparent background.

Rest day:
> Create a premium empty-state illustration for a calisthenics app representing a scheduled rest day. The visual should communicate calm recovery and readiness without looking sleepy or passive. Use blue and green accents, soft glow, and premium app polish. Transparent background.

Future:
- No progress yet
- No skill selected
- No history

## Reusable prompt template

> Create a [asset type] for a premium calisthenics mobile app.
> Purpose: [where it appears].
> Subject: [what it should show].
> Style: premium, modern, energetic, Apple Fitness-inspired feel without copying Apple branding or UI.
> Visual language: deep black base, subtle gradients, soft glow, rounded shapes, high contrast, athletic polish.
> Accent colour: [orange / blue / violet / green / yellow].
> Format: [SVG / PNG].
> Background: [transparent / dark].
> Composition: [compact / centered / vertical / wide].
> Requirements: mobile readability, clean silhouette, no clutter, no stock-photo look, no childish clipart.

## Planned asset structure

```txt
assets/
  generated/
    onboarding/
    goals/
    equipment/
    exercises/
    skills/
    progress/
    milestones/
    empty-states/
```

Suggested names:
- `goal-strength-icon.svg`
- `goal-muscle-icon.svg`
- `exercise-incline-pushup-card.png`
- `exercise-active-hang-card.png`
- `skill-handstand-sigil.svg`
- `milestone-new-skill-unlocked.png`
- `progress-consistency-orbit.svg`

## Production order

### Priority 1
- Onboarding hero
- Goal icons
- Plan-building graphic
- Plan reveal hero
- Today hero
- Workout-complete graphic

### Priority 2
- Exercise illustration system
- Skill sigils
- Node states
- Progress/streak visuals

### Priority 3
- Milestone badges
- Empty states
- Readiness visuals
- Advanced skill header art

## Implementation note

Do not generate these assets until the visual direction is approved. When asset production begins, keep the source prompts, generated assets, and final curated exports versioned together so that later replacements are traceable.
