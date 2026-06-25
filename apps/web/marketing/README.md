# App Store screenshot + preview video production

T40 deliverable. App Store Connect screenshot and 16s preview video, generated from the actual production React components (no faked UI).

## Layout

```
marketing/
├── MANIFEST.json              # every artifact, dimensions, hashes
├── README.md                  # this file
├── screenshots/
│   ├── iPhone-6.7-inch/       # 1290×2796 — App Store Connect iPhone 6.7"
│   ├── iPhone-6.1-inch/       # 1170×2532 — App Store Connect iPhone 6.1"
│   ├── iPhone-5.5-inch/       # 1242×2208 — App Store Connect iPhone 5.5"
│   ├── Android-Phone/         # 1080×1920 — Play Store phone screenshots
│   └── play-store/
│       └── feature-graphic.png  # 1024×500 — Play Store banner
└── video/
    ├── frames/                # 6 captured onboarding stills
    └── onboarding-preview.mp4  # 16.0s H.264 mp4, App Store Connect preview
```

## The 3 App Store slots

| # | Slot headline                            | Captured screen                              |
|---|------------------------------------------|----------------------------------------------|
| 1 | Unlock skills like a video game.         | Home / DAG browse with current node glowing  |
| 2 | Smart adjustments when you fatigue.      | Workout log mid-set + regression prompt      |
| 3 | Train with friends.                      | Social feed with friends' recent unlocks     |

Each slot is a single 1290×2796 div at `/marketing/screenshots/:slot`. The marketing caption strip (eyebrow + headline + wordmark + URL) is composited in-app — no post-process ImageMagick step needed.

## The 16s preview video

Six onboarding steps at 3s each + 0.4s crossfades → 16s total. App Store Connect requires 15-30s.

| Step | Screen                          |
|------|---------------------------------|
| q1   | Can you do a strict pull-up?    |
| q2   | How many strict reps?           |
| q3   | What equipment do you have?     |
| test | RIR-2 push-up test              |
| result | Placement result (3 trees unlocked) |
| first | First workout                   |

## How to re-render

The marketing render scripts assume `npm run preview` is up on :4173, or pass `--dev` to use the dev server on :5173.

```bash
# Build the static bundle
npm run build

# Start the preview server in another terminal
npm run preview    # → http://localhost:4173

# Render all 3 static screenshots
npm run marketing:render

# Render the 6-frame onboarding preview video (~16s, 1290x2796, h264)
npm run marketing:video

# Custom per-frame hold (ms) for longer/shorter video:
npm run marketing:video -- --hold 3500   # ~19s

# Single slot only
npm run marketing:render -- --slot 2
```

## Multi-size variants

The 6.7" (1290×2796) renders are the canonical source — everything else is letterboxed/scaled from them via ffmpeg. The script `render-marketing.ts` produces the 6.7" set; the 6.1" / 5.5" / Android / feature-graphic variants are derived in a single ffmpeg step:

```bash
cd marketing/screenshots

# iPhone 6.1" (1170×2532)
ffmpeg -i iPhone-6.7-inch/default_001.png \
  -vf "scale=1170:2532:force_original_aspect_ratio=decrease,pad=1170:2532:(ow-iw)/2:(oh-ih)/2:color=0x0B1220" \
  iPhone-6.1-inch/default_001.png

# Android phone (1080×1920)
ffmpeg -i iPhone-6.7-inch/default_001.png \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x0B1220" \
  Android-Phone/phone-screenshot-001.png

# Play Store feature graphic (1024×500)
ffmpeg -i iPhone-6.7-inch/default_001.png \
  -vf "scale=1024:-1,crop=1024:500:0:0" \
  play-store/feature-graphic.png
```

All output dimensions are validated by `sips -g pixelWidth -g pixelHeight`. App Store Connect rejects any screenshot whose dimensions don't match the device class exactly — 1290×2796, 1170×2532, 1242×2208 for iPhone; 1080×1920 for Android; 1024×500 for the Play Store banner.

## Verification

After running, `cat MANIFEST.json` lists every file with bytes + md5 + dimensions. The video pipeline enforces a 15-30s duration — if `--hold` produces a video outside that window, the script exits non-zero.

## Why this pipeline

The alternative was to ship marketing screenshots generated outside the app (e.g. via Figma export or PIL mockups). Those would be App Store rejectable: Apple's reviewers compare screenshots against the actual app UI and reject anything that doesn't match. The render script captures the *real* component tree at the exact pixel dimensions Apple requires, so the screenshots and the app agree pixel-for-pixel.
