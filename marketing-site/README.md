# Calisthenics Tree marketing site

Standalone static site for calisthenics-tree.com. Plain HTML, one CSS file
(`assets/site.css`) and one small script (`assets/site.js`). No framework, no
build step, no npm dependencies. The app itself (`apps/web`) is a separate SPA.

```
index.html            Home
skills/index.html     Every tree and every rank (anchors #push #pull #core #legs)
strain/index.html     Unlocks, critical-fail regressions and the strain score
404.html              Not found (noindex)
robots.txt, sitemap.xml, site.webmanifest
assets/               logo, icons, sigils, artwork, og.jpg, site.css, site.js
```

## Preview

```sh
python3 -m http.server 8822 --directory marketing-site
# open http://localhost:8822/
```

Paths are root-relative (`/assets/...`), so serve the folder as the web root.
`python3 -m http.server` doesn't serve `404.html` for unknown paths; real hosts do.

## Deploy

Any static host works. Point it at this folder, with no build command.

- **Cloudflare Pages:** build command empty, output directory `marketing-site`.
  `404.html` is picked up automatically.
- **Coolify (static):** a "Static" app with base directory `/marketing-site`,
  or an nginx/Caddy container serving the folder with `404.html` as the
  not-found page.

`marketing-site/` is listed in the root `.dockerignore`, so it never enters the
web app's Docker build context.

## Configuration

**App URL** (default `https://workout.ashbi.ca`): `APP_URL` at the top of
`assets/site.js` is the single runtime setting. Every app link has
`data-app-path="/onboarding/q1"` (or `/login`, `/privacy`, `/terms`,
`/learn/...`) and the script rewrites its href from `APP_URL`. The hrefs in the
HTML are no-JS and crawler fallbacks; update them with the same value:

```sh
grep -rl 'https://workout.ashbi.ca' marketing-site | xargs sed -i 's#https://workout.ashbi.ca#https://app.calisthenics-tree.com#g'
```

**Canonical domain** (default `https://calisthenics-tree.com`): canonical tags,
Open Graph URLs, JSON-LD, `robots.txt` and `sitemap.xml` must be absolute, so the
domain is written into those files. Change it everywhere with:

```sh
grep -rl 'https://calisthenics-tree.com' marketing-site | xargs sed -i 's#https://calisthenics-tree.com#https://example.com#g'
```

## Keep the content true

Every number and rank on this site comes from the code. When the product
changes, update the site in the same PR.

- **Ranks and targets** (`skills/index.html`, the tree cards and the hero path
  on `index.html`): seed migrations `apps/api/alembic/versions/0001_initial.py`
  (Push, Pull, Core) and `0010_legs_tree.py` (Legs). The "40 skill nodes across
  4 trees" claim depends on these.
- **Rank links** go to the app's public `/learn/:slug` pages. Slugs are
  `{tree_slug}-r{rank}-{slugified name}` (see `nodeSlug` in
  `apps/web/src/pages/NodeLandingPage.tsx`). Renaming a seed exercise breaks
  its link.
- **Placement** copy: `apps/api/calisthenics_api/placement/__init__.py`
  (two questions, push-up test, the -2 / 0 / +1 offsets).
- **Regressions and unlocks:** `apps/api/calisthenics_api/routes/workouts.py`
  (critical-fail thresholds) and the regression edges in the seed migrations.
- **Strain score** (`strain/index.html`, home feature and FAQ):
  `apps/api/calisthenics_api/tendon/__init__.py` and
  `apps/api/calisthenics_api/routes/tendon_strain.py` (this week vs the previous
  three weeks; watch above 1.15×, deload above 1.5×).
- **Pricing:** there's no paywall in the app, so the site says it's free right
  now (FAQ and JSON-LD `offers`). Update both when the paywall ships.
- Bump `lastmod` in `sitemap.xml` when a page changes.

## Assets

Artwork, icons, sigils and the logo were generated with Higgsfield. The Legs
sigil (`assets/icons/sigil-legs.svg`) is a hand-drawn placeholder because no
Legs sigil was generated. The push/pull/core sigils and feature icons have white
details, so use them on dark backgrounds only.
