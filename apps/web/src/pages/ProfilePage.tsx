/**
 * ProfilePage — /u/:userId
 *
 * Public profile (requires auth — anyone with the link can view, but
 * you must be signed in to see profiles; the gate is in RequireAuth).
 * Shows display name + current node per tree + recent unlocks.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  UserPlus,
  UserMinus,
} from 'lucide-react';

import {
  ApiError,
  getPublicProfile,
  getUserUnlocks,
  getFriends,
  followUser,
  unfollowUser,
  type PublicProfile,
  type FeedItem,
  type FriendSummary,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/button';

type Status = 'loading' | 'ready' | 'notfound' | 'error';

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (Number.isNaN(diff)) return '';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ProfilePage() {
  const { userId = '' } = useParams<{ userId: string }>();
  const { user: me } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [unlocks, setUnlocks] = useState<FeedItem[]>([]);
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [followBusy, setFollowBusy] = useState(false);

  const isMe = me?.id === userId;
  const isFollowing = friends.some((f) => f.user_id === userId);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setStatus('loading');
    setErrorMsg(null);

    Promise.all([
      getPublicProfile(userId),
      getUserUnlocks(userId, 20),
      getFriends(),
    ])
      .then(([p, u, f]) => {
        if (cancelled) return;
        setProfile(p);
        setUnlocks(u.items);
        setFriends(f.items);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setStatus('notfound');
          return;
        }
        setErrorMsg(
          err instanceof Error ? err.message : 'Failed to load profile',
        );
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleFollowToggle = async () => {
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await unfollowUser(userId);
        setFriends((prev) => prev.filter((f) => f.user_id !== userId));
      } else {
        await followUser({ user_id: userId });
        // Refresh the friends list to pick up the new entry with full data
        const f = await getFriends();
        setFriends(f.items);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError
          ? `${err.status} ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Unknown error',
      );
    } finally {
      setFollowBusy(false);
    }
  };

  if (status === 'loading') {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-3 px-4 py-8"
      >
        <Loader2 aria-hidden className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (status === 'notfound' || (status === 'ready' && !profile)) {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-4 py-8"
      >
        <h1 className="text-2xl font-semibold">User not found</h1>
        <Link to="/feed" className="btn-ghost">
          Back to feed
        </Link>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-4 py-8"
      >
        <AlertCircle aria-hidden className="h-8 w-8 text-danger" />
        <p className="text-sm text-surface-fg-muted">{errorMsg}</p>
      </main>
    );
  }

  if (!profile) return null;

  const displayLabel =
    profile.display_name ?? profile.email.split('@')[0];

  return (
    <main
      id="main"
      className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8"
      data-testid="profile-page"
    >
      <Link
        to="/feed"
        className="inline-flex items-center gap-1 text-xs font-medium text-surface-fg-muted transition-colors hover:text-surface-fg"
      >
        <ArrowLeft aria-hidden className="h-3 w-3" />
        Back to feed
      </Link>

      <header className="space-y-3">
        <p className="display-eyebrow">Profile</p>
        <h1 className="text-4xl font-bold leading-heading tracking-tighter">
          {displayLabel}
        </h1>
        <p className="font-mono text-xs text-surface-fg-muted">{profile.email}</p>
        {!isMe && (
          <Button
            type="button"
            variant={isFollowing ? 'ghost' : 'default'}
            size="sm"
            onClick={handleFollowToggle}
            disabled={followBusy}
            data-testid="profile-follow-toggle"
          >
            {followBusy ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : isFollowing ? (
              <>
                <UserMinus aria-hidden className="h-4 w-4" />
                Unfollow
              </>
            ) : (
              <>
                <UserPlus aria-hidden className="h-4 w-4" />
                Follow
              </>
            )}
          </Button>
        )}
      </header>

      {/* Current nodes */}
      <section aria-labelledby="current-trees-heading" className="space-y-3">
        <h2
          id="current-trees-heading"
          className="text-sm font-semibold uppercase tracking-wider text-surface-fg-muted"
        >
          Currently training
        </h2>
        {profile.current_nodes.length === 0 ? (
          <p className="text-sm text-surface-fg-muted">
            No progressions yet.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {profile.current_nodes.map((c) => (
              <li key={c.tree_id} className="card space-y-1">
                <p className="text-xs uppercase tracking-wider text-surface-fg-muted">
                  {c.tree_name}
                </p>
                <p className="font-semibold">{c.node_name}</p>
                <Link
                  to={`/tree/${encodeURIComponent(c.tree_id)}`}
                  className="text-xs text-primary underline"
                >
                  View tree
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent unlocks */}
      <section aria-labelledby="recent-unlocks-heading" className="space-y-3">
        <h2
          id="recent-unlocks-heading"
          className="text-sm font-semibold uppercase tracking-wider text-surface-fg-muted"
        >
          Recent unlocks
        </h2>
        {unlocks.length === 0 ? (
          <p className="text-sm text-surface-fg-muted">
            No recent activity.
          </p>
        ) : (
          <ol className="space-y-2">
            {unlocks.map((item) => (
              <li
                key={item.id}
                className="card flex items-start gap-3"
              >
                {item.trigger === 'PROMOTION' ? (
                  <TrendingUp
                    aria-hidden
                    className="mt-0.5 h-4 w-4 shrink-0 text-success"
                  />
                ) : (
                  <TrendingDown
                    aria-hidden
                    className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                  />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm">
                    {item.trigger === 'PROMOTION' ? 'Unlocked' : 'Regressed to'}{' '}
                    <span className="font-semibold">{item.new_node_name}</span>
                    {' '}on {item.tree_name}
                  </p>
                  <p className="text-xs text-surface-fg-subtle">
                    {timeAgo(item.occurred_at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}