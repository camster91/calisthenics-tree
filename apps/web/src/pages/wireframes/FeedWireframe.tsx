/**
 * Wireframe — Social Feed.
 *
 * Production route: `/feed`. Authed. Priority P1.
 * Multi-state (empty/loading/success). Default render = success.
 */
import { useSearchParams } from 'react-router-dom';
import { Heart, MessageCircle, Repeat2 } from 'lucide-react';
import {
  PageHeader,
  Section,
  EmptyState,
  Skeleton,
  PlaceholderAvatar,
  PlaceholderLine,
  StatChip,
} from './_primitives';

const POSTS = [
  {
    user: '@maria_pulls',
    when: '2h ago',
    body: 'Hit 3×8 archer rows. Front lever feels close.',
    tree: 'Pull → Front Lever',
    reps: '3×8 archer row',
    likes: 12,
    replies: 3,
  },
  {
    user: '@derek_planche',
    when: '5h ago',
    body: 'Tuck planche 12s × 3. Wrist felt it — taking tomorrow off.',
    tree: 'Push → Handstand',
    reps: '3×12s tuck planche',
    likes: 28,
    replies: 7,
  },
  {
    user: '@noor_dragons',
    when: 'yesterday',
    body: 'Half dragon flag unlocked!! 🎉',
    tree: 'Core → Dragon Flag',
    reps: 'milestone',
    likes: 41,
    replies: 11,
  },
];

export default function FeedWireframe() {
  const [params] = useSearchParams();
  const state = (params.get('state') ?? 'success') as
    | 'empty'
    | 'loading'
    | 'success';

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Feed"
        title="People you follow"
        description="Workouts, milestones, and notes from your friends."
        actions={
          <a className="btn-primary" href="/wireframes/friend-profile">
            Find people
          </a>
        }
      />

      {state === 'empty' && (
        <EmptyState
          icon={Heart}
          title="No posts yet"
          body="Follow some people to see their workouts and milestones here."
          primaryCta={{ label: 'Find people', href: '/wireframes/friend-profile' }}
          secondaryCta={{ label: 'Invite a friend', href: '/wireframes/home' }}
        />
      )}

      {state === 'loading' && (
        <Section>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton variant="circle" />
                  <div className="flex-1 space-y-2">
                    <Skeleton variant="line" className="w-1/3" />
                    <Skeleton variant="line" className="w-1/4" />
                  </div>
                </div>
                <Skeleton variant="line" className="w-full" />
                <Skeleton variant="line" className="w-2/3" />
              </div>
            ))}
          </div>
        </Section>
      )}

      {state === 'success' && (
        <Section>
          <div className="space-y-3">
            {POSTS.map((p, i) => (
              <article key={i} className="card space-y-3">
                <header className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <PlaceholderAvatar size={40} />
                    <div>
                      <p className="text-sm font-semibold">{p.user}</p>
                      <p className="text-xs text-surface-fg-subtle">{p.when}</p>
                    </div>
                  </div>
                  <span className="chip">{p.tree}</span>
                </header>
                <p className="text-sm leading-relaxed">{p.body}</p>
                <div className="flex items-center justify-between border-t border-surface-border pt-3 text-xs text-surface-fg-subtle">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Heart aria-hidden className="h-4 w-4" /> {p.likes}
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <MessageCircle aria-hidden className="h-4 w-4" />{' '}
                      {p.replies}
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Repeat2 aria-hidden className="h-4 w-4" />
                    </button>
                  </div>
                  {p.reps !== 'milestone' && (
                    <StatChip label="Logged" value={p.reps} />
                  )}
                </div>
                <PlaceholderLine width="0%" />
              </article>
            ))}
          </div>
        </Section>
      )}

      <div data-dev="true" className="border-t border-dashed border-surface-border pt-4 text-xs text-surface-fg-subtle">
        <span className="font-semibold uppercase tracking-wide">State:</span>{' '}
        {(['empty', 'loading', 'success'] as const).map((s, i) => (
          <span key={s}>
            <a
              className={state === s ? 'text-primary' : 'underline'}
              href={`/wireframes/feed?state=${s}`}
            >
              {s}
            </a>
            {i < 2 ? ' · ' : ''}
          </span>
        ))}
      </div>
    </div>
  );
}