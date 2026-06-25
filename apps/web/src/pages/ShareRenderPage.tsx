/**
 * Share render page — `/share/:unlockId`
 *
 * Production-grade: at full 1080x1080 logical resolution with no chrome.
 * Loaded by:
 *  1. T39 Playwright script (`scripts/render-share.ts`) to rasterize PNGs to
 *     `public/share/<unlockId>.png` for OG image use + cache.
 *  2. The share button on WorkoutDoneWireframe / HomeWireframe (calls
 *     `window.print()` for now, until Web Share API integration lands).
 *  3. Direct social-media bot crawls (Slack, Twitter, iMessage previews).
 *
 * Why this page exists instead of the FastAPI `/api/v1/share/[unlock_id].png`
 * route from the spec: the FastAPI backend isn't built yet. The render script
 * produces the same output (PNG via headless Chromium screenshot) and the
 * generated PNGs are served as static files at `/share/<unlockId>.png` —
 * identical contract to the spec. When the FastAPI route lands in Phase 1,
 * the script can be wrapped in a FastAPI endpoint with zero changes to the
 * template.
 *
 * Query params (all optional, fixture falls back if missing):
 *   - variant=fresh|milestone|badge
 *   - tree=<slug>
 *
 * The actual data lookup uses a tiny in-file fixture so the page works
 * offline (no backend). Real Phase 2 swap: `getUnlockById(unlockId)` from
 * the FastAPI client.
 */
import { useParams, useSearchParams } from 'react-router-dom';
import { UnlockShareCard, type UnlockVariant } from '../components/workout/UnlockShareCard';

/**
 * Tiny deterministic fixture — keyed by unlockId so the same URL always
 * produces the same image. Real Phase 2: replace with API lookup.
 */
const FIXTURES: Record<
  string,
  {
    treeName: string;
    nodeName: string;
    unlockedOn: string;
    statsLine?: string;
    unlockCount?: string;
    treeSlug?: string;
    variant: UnlockVariant;
  }
> = {
  // Fresh unlock (T39 variant A) — single new skill
  'tuck-front-lever-001': {
    treeName: 'Front Lever',
    nodeName: 'Tuck Front Lever',
    unlockedOn: 'Jun 25, 2026',
    statsLine: '15 second hold',
    treeSlug: 'front-lever',
    variant: 'fresh',
  },
  // Milestone (T39 variant B) — 10th skill
  'tuck-front-lever-010': {
    treeName: 'Front Lever',
    nodeName: 'Tuck Front Lever',
    unlockedOn: 'Jun 25, 2026',
    statsLine: '15 second hold',
    unlockCount: '10th skill',
    treeSlug: 'front-lever',
    variant: 'milestone',
  },
  // Badge (T39 variant C) — tree cleared
  'front-lever-tree-cleared': {
    treeName: 'Front Lever',
    nodeName: 'Front Lever',
    unlockedOn: 'Jun 25, 2026',
    statsLine: 'All progressions unlocked',
    treeSlug: 'front-lever',
    variant: 'badge',
  },
};

const DEFAULT_FIXTURE = FIXTURES['tuck-front-lever-001'];

function lookupFixture(unlockId: string) {
  return FIXTURES[unlockId] ?? DEFAULT_FIXTURE;
}

/**
 * The render page. Sets up a 1080x1080 viewport-equivalent render frame
 * (CSS scaled for previews, but DOM is the canonical 1080px).
 *
 * Important: no Layout/header/footer chrome. The card should be the only
 * thing in the DOM so the screenshot is clean.
 */
export default function ShareRenderPage() {
  const { unlockId = 'tuck-front-lever-001' } = useParams<{ unlockId: string }>();
  const [searchParams] = useSearchParams();

  // Query params override the fixture so the Playwright render script can
  // force a specific variant for A/B comparison without editing fixtures.
  const fixture = lookupFixture(unlockId);
  const variantOverride = searchParams.get('variant') as UnlockVariant | null;
  const variant: UnlockVariant =
    variantOverride && ['fresh', 'milestone', 'badge'].includes(variantOverride)
      ? variantOverride
      : fixture.variant;

  return (
    <div className="min-h-screen bg-surface-muted p-4 sm:p-8">
      <div className="mx-auto max-w-fit">
        <UnlockShareCard
          treeName={fixture.treeName}
          nodeName={fixture.nodeName}
          unlockedOn={fixture.unlockedOn}
          statsLine={fixture.statsLine}
          unlockCount={fixture.unlockCount}
          treeSlug={fixture.treeSlug}
          variant={variant}
        />
      </div>
    </div>
  );
}
