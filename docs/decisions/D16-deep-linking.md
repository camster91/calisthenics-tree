# D16 — Deep linking

Status: **DRAFT — needs decision before Phase 2 web app**

## The flow

User clicks `https://calisthenics-tree.com/shared/routine/e3810-ac8d-44a1` (a shareable routine URL).

Three possible destinations:
1. **App installed** → open the routine in the app, pre-loaded as a workout session
2. **App installed, not logged in** → open the app to login, then route to the routine after auth
3. **App not installed** → render a static preview page with a CTA to install

## URL structure

```
calisthenics-tree.com/
  /                                        # Marketing site
  /login                                   # Web login
  /onboarding/...                          # Onboarding flow
  /shared/routine/<routine_id>             # Shareable routine
  /shared/unlock/<unlock_id>               # Shareable unlock (Phase 4+)
  /skills/<tree_slug>/<node_slug>          # SEO landing page
  /support
  /privacy
  /terms

calisteniapp:// (or universal links)
  /routine/<routine_id>                    # Deep link to routine
  /workout/<node_id>                       # Deep link to specific workout
```

## Universal Links (iOS)

Required configuration:
1. `apple-app-site-association` file at `https://calisthenics-tree.com/.well-known/apple-app-site-association`
2. Associated Domains entitlement in Xcode with `applinks:calisthenics-tree.com`
3. Apple validates the AASA file before universal links work. Re-validate after any path change.

## App Link (Android, Phase 6+)

Same as iOS but with `.well-known/assetlinks.json` and Android Studio's App Links Assistant.

## Custom URL scheme (fallback)

`calisteniapp://` works without server config but is fragile (other apps can register the same scheme). Use only as a fallback for older iOS versions.

## Behavior per state

### App installed, opened, logged in
- Universal Link → app opens → app fetches routine data → routes to /workout/<node_id>
- Custom scheme link → same, but via `Linking.openURL`

### App installed, opened, not logged in
- Universal Link → app opens → routes to /login → after login → routes to /workout/<node_id>
- Preserve the deep link target in app state so we route there after auth

### App not installed, user on iOS Safari
- HTML page renders: "Install Calisthenics Tree to use this routine"
- CTA: App Store badge, deep-link parameter preserved via `?utm_source=share&routine_id=e3810-ac8d-44a1` so we can resume the deep link after install
- After install + first open, app checks for `routine_id` URL param and routes accordingly

### App not installed, user on Android (Phase 6+)
- Same, with Play Store badge

## Routine data via deep link

The routine URL is shareable because it's lightweight. Server payload:
```json
{
  "routine_id": "e3810-ac8d-44a1",
  "title": "Bianca's Tuesday Push Day",
  "nodes": [
    {"node_id": "node_pike_pushup_02", "sets": 3, "reps": 8},
    {"node_id": "node_dip_01", "sets": 3, "reps": 10}
  ],
  "author_handle": "@bianca",
  "shared_at": "2026-06-25T14:32:11Z"
}
```

~300 bytes. Fetchable on the web preview page (no auth required for reading). Full data only when the user is logged in.

## Action
T13 (domain purchase) is prerequisite. T14 (SEO landing pages) implements the web fallback. Phase 4 native shell sets up Universal Links. Routine data API in T6 endpoints.