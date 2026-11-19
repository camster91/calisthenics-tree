/**
 * LandingPage — /welcome
 *
 * Public page for anonymous visitors. Restyled (Brand Lock V3) to match the
 * standalone marketing site: true-black page, logo + wordmark top bar,
 * hero-handstand art behind the headline, Saira condensed display type,
 * one movement colour per tree card.
 *
 * Every product claim on this page is checked against the code:
 * - 4 trees × 10 ranks = 40 skill nodes (Legs added in migration 0010)
 * - placement = two yes/no questions + one push-up set
 * - unlock = every target set at the target reps / hold
 * - strain = this week's load per joint vs the recent average; a heads-up
 *   past 1.5×, never an automatic deload
 * No prices, no app-store claims.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, Minus } from 'lucide-react';

import { Button } from '../components/ui/button';
import { BrandMark } from '../components/brand/BrandMark';
import { TreeSigil } from '../components/brand/TreeSigil';
import { MOVEMENT_COLOR, MOVEMENT_LABEL, type Movement } from '../lib/movement';

const FEATURES = [
  {
    icon: '/brand/icons/placement.svg',
    title: 'Start on the right rung',
    body: 'Two yes-or-no questions and one push-up set, stopped with about two reps left in the tank. That places you on every tree.',
  },
  {
    icon: '/brand/icons/unlock.svg',
    title: '40 skill nodes across 4 trees',
    body: 'Ten ranks per tree. Hit every target set at the target reps or hold and the next node unlocks. Fall well short and it steps you back to an easier variation.',
  },
  {
    icon: '/brand/icons/strain.svg',
    title: 'Know when to back off',
    body: 'Every set adds load to the joints it works. When a joint’s load this week runs past 1.5× your recent average, you get a heads-up to back off.',
    note: 'Training guidance, not medical advice.',
  },
] as const;

const TREES: { movement: Movement; from: string; to: string }[] = [
  { movement: 'push', from: 'Wall push-up', to: 'Planche push-up on rings' },
  { movement: 'pull', from: 'Dead hang', to: 'Front lever pull' },
  { movement: 'core', from: 'Plank', to: 'Full dragon flag' },
  { movement: 'legs', from: 'Bodyweight squat', to: 'Weighted pistol squat' },
];

/**
 * Ten-rank arc: the skill path motif. Ten nodes rising along a curve, the
 * first three lit in the tree's colour, the rest dim. Decorative.
 */
function RankArc({ color }: { color: string }) {
  const nodes = Array.from({ length: 10 }, (_, i) => {
    const t = i / 9;
    // Quadratic curve from bottom-left to top-right.
    const x = 8 + t * 184;
    const y = 52 - Math.sin(t * Math.PI * 0.5) * 44;
    return { x, y, lit: i < 3 };
  });
  const d = nodes.map((n, i) => `${i === 0 ? 'M' : 'L'}${n.x.toFixed(1)} ${n.y.toFixed(1)}`).join(' ');
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 60"
      width="200"
      height="60"
      className="h-auto w-full max-w-60"
      fill="none"
    >
      <path d={d} stroke="rgb(255 255 255 / 0.12)" strokeWidth="1.5" />
      <path
        d={nodes
          .slice(0, 3)
          .map((n, i) => `${i === 0 ? 'M' : 'L'}${n.x.toFixed(1)} ${n.y.toFixed(1)}`)
          .join(' ')}
        stroke={color}
        strokeWidth="2"
      />
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r={i === 2 ? 4.5 : 3.25}
          fill={n.lit ? color : '#1C1C1E'}
          stroke={n.lit ? color : 'rgb(255 255 255 / 0.18)'}
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-surface-fg">
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link to="/welcome" className="rounded-md" aria-label="Calisthenics Tree, home">
          <BrandMark size={32} />
        </Link>
        <Link
          to="/login"
          className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-surface-fg transition-colors hover:text-primary"
        >
          Sign in
        </Link>
      </header>

      <main id="main" tabIndex={-1}>
        {/* Hero — art on the right, copy on the left in the image's empty space. */}
        <section className="relative isolate overflow-hidden" aria-labelledby="hero-heading">
          <div className="relative h-72 sm:h-96 md:absolute md:inset-0 md:h-auto">
            <img
              src="/brand/img/hero-handstand.webp"
              width={2000}
              height={1129}
              alt="An athlete holding a handstand on parallettes in front of a glowing skill tree."
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-cover object-[72%_40%] md:object-[70%_50%]"
            />
            {/* Mobile: fade the bottom into the copy. Desktop: fade the left. */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black md:bg-gradient-to-r md:from-black md:via-black/70 md:to-transparent"
            />
            {/* Desktop: soften the image's top and bottom edges into the page. */}
            <div
              aria-hidden
              className="absolute inset-0 hidden bg-[linear-gradient(to_bottom,#000_0%,transparent_14%,transparent_80%,#000_100%)] md:block"
            />
          </div>

          <div className="relative mx-auto max-w-6xl px-5 pb-16 sm:px-8 md:py-32 lg:py-40">
            <div className="max-w-xl space-y-6">
              <h1
                id="hero-heading"
                className="display-hero text-balance text-6xl sm:text-7xl lg:text-8xl"
              >
                Earn every skill.
              </h1>
              <p className="text-pretty text-lg leading-body text-surface-fg-muted sm:text-xl">
                Calisthenics Tree places you on the right rung of a real
                progression tree, moves you up when you&rsquo;ve earned it,
                and tells you when to back off.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button asChild variant="default" size="lg" className="shadow-glow">
                  <Link to="/onboarding/q1">
                    Find your level
                    <ArrowRight aria-hidden className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-surface-border-strong bg-black/40"
                >
                  <Link to="/login" data-testid="welcome-signin">
                    Sign in
                  </Link>
                </Button>
              </div>
              <p className="text-sm text-surface-fg-muted">
                Takes about two minutes. No equipment needed for the placement
                test.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          className="mx-auto max-w-6xl px-5 py-16 sm:px-8"
          aria-labelledby="features-heading"
        >
          <h2 id="features-heading" className="display-section text-4xl sm:text-5xl">
            How it works
          </h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface-subtle p-6"
              >
                <img
                  src={f.icon}
                  width={48}
                  height={48}
                  alt=""
                  loading="lazy"
                  className="h-12 w-12"
                />
                <h3 className="text-xl font-semibold">{f.title}</h3>
                <p className="text-base leading-body text-surface-fg-muted">{f.body}</p>
                {'note' in f && (
                  <p className="mt-auto text-sm text-surface-fg-subtle">{f.note}</p>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Four trees */}
        <section
          className="mx-auto max-w-6xl px-5 py-16 sm:px-8"
          aria-labelledby="trees-heading"
        >
          <h2 id="trees-heading" className="display-section text-4xl sm:text-5xl">
            Four trees, ten ranks each
          </h2>
          <p className="mt-3 max-w-xl text-base leading-body text-surface-fg-muted">
            Each tree is one line of real progressions, from the first rung
            anyone can do to a skill most people never reach.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TREES.map((tree) => {
              const color = MOVEMENT_COLOR[tree.movement];
              return (
                <li
                  key={tree.movement}
                  className="flex flex-col gap-4 rounded-xl border bg-surface-subtle p-5"
                  style={{ borderColor: `color-mix(in srgb, ${color} 28%, transparent)` }}
                >
                  <div className="flex items-center gap-3">
                    <TreeSigil movement={tree.movement} size={40} />
                    <h3 className="text-lg font-semibold">{MOVEMENT_LABEL[tree.movement]}</h3>
                  </div>
                  <RankArc color={color} />
                  <p className="text-sm leading-body text-surface-fg-muted">
                    <span className="text-surface-fg">{tree.from}</span> to{' '}
                    <span className="text-surface-fg">{tree.to}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* What we don't do */}
        <section
          className="mx-auto max-w-6xl px-5 py-16 sm:px-8"
          aria-labelledby="dont-heading"
        >
          <h2 id="dont-heading" className="display-section text-3xl sm:text-4xl">
            What we don&rsquo;t do
          </h2>
          <ul className="mt-6 space-y-3 text-base leading-body text-surface-fg-muted">
            <li className="flex items-start gap-3">
              <Minus aria-hidden className="mt-1 h-4 w-4 shrink-0 text-surface-fg-subtle" />
              <span>No daily reminders or push notifications.</span>
            </li>
            <li className="flex items-start gap-3">
              <Minus aria-hidden className="mt-1 h-4 w-4 shrink-0 text-surface-fg-subtle" />
              <span>No computer-vision form check. We trust you.</span>
            </li>
          </ul>
        </section>
      </main>

      <footer className="border-t border-surface-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-5 py-8 text-sm text-surface-fg-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <BrandMark size={24} />
          <nav aria-label="Legal" className="flex gap-2">
            <Link
              to="/privacy"
              className="inline-flex min-h-11 items-center rounded-md px-2 hover:text-surface-fg"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="inline-flex min-h-11 items-center rounded-md px-2 hover:text-surface-fg"
            >
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
