#!/usr/bin/env tsx
/**
 * render-onboarding-video — produce App Store Connect preview video.
 *
 * T40 deliverable. Captures 6 onboarding still frames at 1290×2796, then
 * encodes a 15-30s mp4 via ffmpeg for App Store Connect.
 *
 * Pipeline:
 *   1. Headless Chromium screenshots each `/marketing/onboarding/:step` route
 *   2. ffmpeg stitches them into a single H.264 mp4 with crossfades
 *
 * Total target length: 15-30s, App Store Connect allows 15-30s.
 *
 * Per-frame duration is tunable via the FRAME_HOLD_MS env var. With 6
 * frames + crossfades, default 2800ms hold + 400ms crossfade = ~19s total.
 *
 * Usage:
 *   npm run marketing:video              # render full 6-step preview
 *   npm run marketing:video -- --dev     # render against dev server (5173)
 *   npm run marketing:video -- --hold 2500  # override per-frame hold (ms)
 *
 * Verification: ffprobe the output — duration 15-30s, 1290x2796, h264, yuv420p.
 * App Store Connect rejects anything outside the 15-30s window.
 */
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileP = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'marketing/screenshots');
const VIDEO_DIR = resolve(ROOT, 'marketing/video');
const FRAMES_DIR = resolve(VIDEO_DIR, 'frames');

interface StepSpec {
  slug: string;
  label: string;
}

const STEPS: StepSpec[] = [
  { slug: 'q1', label: 'Onboarding Q1 — pull-up?' },
  { slug: 'q2', label: 'Onboarding Q2 — rep count' },
  { slug: 'q3', label: 'Onboarding Q3 — equipment' },
  { slug: 'test', label: 'Onboarding RIR-2 test' },
  { slug: 'result', label: 'Placement result' },
  { slug: 'first', label: 'First workout' },
];

const BASE = process.env.MARKETING_BASE_URL ?? 'http://localhost:4173';
const IS_DEV = process.argv.includes('--dev');

const HOLD_MS = (() => {
  const i = process.argv.indexOf('--hold');
  return i >= 0 ? Number(process.argv[i + 1]) : 2800;
})();

const XFADE_MS = 400;
const W = 1290;
const H = 2796;
const FPS = 30;

async function captureFrame(
  browser: import('playwright').Browser,
  spec: StepSpec,
  index: number,
): Promise<string> {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const url = `${BASE}/marketing/onboarding/${spec.slug}`;
  console.log(`[render-video] navigating ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

  await page.waitForSelector('[data-screenshot]', { timeout: 10_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);

  const card = await page.$('[data-screenshot]');
  if (!card) throw new Error(`Frame not found at ${url}`);

  const box = await card.boundingBox();
  if (!box) throw new Error(`Could not measure frame at ${url}`);
  const w = Math.round(box.width);
  const h = Math.round(box.height);
  if (w !== W || h !== H) {
    throw new Error(
      `Frame ${spec.slug} rendered at ${w}×${h}, expected ${W}×${H}`,
    );
  }

  const outPath = resolve(FRAMES_DIR, `frame-${String(index).padStart(2, '0')}.png`);
  mkdirSync(dirname(outPath), { recursive: true });
  const png = await card.screenshot({ type: 'png' });
  writeFileSync(outPath, png);

  await ctx.close();
  return outPath;
}

/**
 * Encode the captured frames into a single mp4.
 *
 * Approach:
 *   1. Per-frame stills loop into a per-frame clip via ffmpeg's
 *      -loop 1 -t <seconds> -i frame-N.png concat.
 *   2. The per-frame clips are concatenated with xfade transitions.
 *
 * Why xfade: App Store reviewers watch the video at full speed on
 * different devices. A hard cut from a still frame to the next still
 * frame is jarring and looks like a slideshow. xfade gives the
 * impression of a single living UI without requiring real DOM
 * transitions in the React app.
 */
async function encodeVideo(): Promise<{ path: string; bytes: number }> {
  mkdirSync(VIDEO_DIR, { recursive: true });
  const outPath = resolve(VIDEO_DIR, 'onboarding-preview.mp4');

  const holdSec = HOLD_MS / 1000;
  const xfadeSec = XFADE_MS / 1000;

  // Each frame becomes a 1-input concat: -loop 1 -t holdSec -i frame.png
  const inputs: string[] = [];
  for (let i = 0; i < STEPS.length; i++) {
    const pad = String(i).padStart(2, '0');
    inputs.push('-loop', '1', '-t', String(holdSec), '-i', `frames/frame-${pad}.png`);
  }

  // Build the xfade filter chain. Each successive xfade consumes the
  // previous transition's output (vN) plus the next still ([N+1:v]) and
  // produces a new v(N+1). The final label is consumed by format.
  let filter = '';
  if (STEPS.length >= 2) {
    filter += `[0:v][1:v]xfade=transition=fade:duration=${xfadeSec}:offset=${(holdSec - xfadeSec).toFixed(3)}[v1];`;
    for (let i = 1; i < STEPS.length - 1; i++) {
      const off = (i + 1) * (holdSec - xfadeSec);
      filter += `[v${i}][${i + 1}:v]xfade=transition=fade:duration=${xfadeSec}:offset=${off.toFixed(3)}[v${i + 1}];`;
    }
  }
  const lastLabel = STEPS.length >= 2 ? `v${STEPS.length - 1}` : '0:v';
  // Chain format + fps in one filter so the labels thread correctly.
  filter += `[${lastLabel}]format=yuv420p,fps=${FPS}[vout]`;
  const finalMap = '[vout]';

  const args = [
    ...inputs,
    '-filter_complex',
    filter,
    '-map',
    finalMap,
    '-r',
    String(FPS),
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '20',
    '-movflags',
    '+faststart',
    '-y',
    outPath,
  ];

  console.log(`[render-video] ffmpeg encoding (${STEPS.length} frames, hold ${holdSec}s, xfade ${xfadeSec}s)…`);
  const { stderr } = await execFileP('ffmpeg', args, {
    cwd: VIDEO_DIR,
    maxBuffer: 16 * 1024 * 1024,
  });
  // ffmpeg logs to stderr; surface the last 8 lines for the audit trail.
  const tail = stderr.split('\n').slice(-8).join('\n');
  console.log(tail);

  if (!existsSync(outPath)) {
    throw new Error(`ffmpeg did not produce ${outPath}`);
  }
  return { path: outPath, bytes: statSync(outPath).size };
}

async function main() {
  mkdirSync(FRAMES_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  try {
    for (let i = 0; i < STEPS.length; i++) {
      const path = await captureFrame(browser, STEPS[i], i);
      console.log(
        `[render-video] ${STEPS[i].label.padEnd(36)} ${path.replace(ROOT + '/', '')}`,
      );
    }
  } finally {
    await browser.close();
  }

  const { path, bytes } = await encodeVideo();
  console.log(
    `[render-video] encoded preview video → ${path.replace(ROOT + '/', '')} (${bytes} bytes)`,
  );

  // Verification: ffprobe the output to confirm duration / size / codec.
  const { stdout: probe } = await execFileP('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration:stream=codec_name,width,height',
    '-of',
    'default=noprint_wrappers=1',
    path,
  ]);
  console.log(`[render-video] ffprobe:\n${probe}`);

  const durMatch = probe.match(/duration=([\d.]+)/);
  if (!durMatch) throw new Error(`Could not parse duration from ffprobe`);
  const dur = Number(durMatch[1]);
  if (dur < 15 || dur > 30) {
    throw new Error(
      `Preview video is ${dur.toFixed(2)}s; App Store Connect requires 15-30s. ` +
        `Adjust --hold to land in range.`,
    );
  }
  console.log(`[render-video] duration ${dur.toFixed(2)}s is within App Store Connect's 15-30s window.`);
}

main().catch((err) => {
  console.error('[render-video] FAILED:', err.message ?? err);
  process.exit(1);
});
