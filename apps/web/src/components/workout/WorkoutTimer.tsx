/**
 * WorkoutTimer — large circular countdown timer.
 *
 * - Display: full-circle progress ring with monospace big number inside.
 * - Tap target: the whole disk is pressable.
 *   * Hold (>500ms) → pause / resume with haptic 'success'
 *   * Double-tap → restart with haptic 'warning'
 * - States: running | paused | finished
 * - Accessible: timer role, aria-live=off for clock (annoying) but
 *   aria-live=polite announcements on pause / finish.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '../../lib/cn';
import { useHaptic } from '../../lib/useHaptic';

export interface WorkoutTimerProps {
  /** Total seconds to count down from. */
  durationSecs: number;
  /** Called when the timer reaches 0. */
  onFinish?: () => void;
  /** Optional label shown above the digits (e.g. "HOLD"). */
  label?: string;
  className?: string;
}

type TimerState = 'running' | 'paused' | 'finished';

const RING_RADIUS = 130;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function WorkoutTimer({
  durationSecs,
  onFinish,
  label,
  className,
}: WorkoutTimerProps) {
  const haptic = useHaptic();
  const [state, setState] = useState<TimerState>('running');
  const [remaining, setRemaining] = useState(durationSecs);
  const intervalRef = useRef<number | null>(null);
  // Hold-to-pause tracking
  const holdStartRef = useRef<number | null>(null);
  const holdTriggeredRef = useRef(false);
  // Double-tap tracking
  const lastTapRef = useRef<number>(0);

  // Tick driver
  useEffect(() => {
    if (state !== 'running') {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setState('finished');
          haptic('success');
          onFinish?.();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state, haptic, onFinish]);

  // Reset when duration changes
  useEffect(() => {
    setRemaining(durationSecs);
    setState('running');
  }, [durationSecs]);

  const handlePointerDown = useCallback(() => {
    holdStartRef.current = Date.now();
    holdTriggeredRef.current = false;
  }, []);

  const handlePointerUp = useCallback(() => {
    const start = holdStartRef.current;
    holdStartRef.current = null;
    if (start == null) return;

    const held = Date.now() - start;
    if (held >= 500) {
      // hold = pause/resume
      holdTriggeredRef.current = true;
      setState((s) => {
        if (s === 'finished') return s;
        const next = s === 'running' ? 'paused' : 'running';
        haptic(next === 'running' ? 'success' : 'tap');
        return next;
      });
      return;
    }

    // tap path: check for double-tap (restart)
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      setRemaining(durationSecs);
      setState('running');
      haptic('warning');
      return;
    }
    lastTapRef.current = now;
  }, [haptic, durationSecs]);

  const progress = Math.max(0, Math.min(1, remaining / durationSecs));
  const dashOffset = RING_CIRC * (1 - progress);

  return (
    <div
      role="timer"
      aria-label={`${label ?? 'Timer'}: ${formatTime(remaining)} remaining`}
      data-state={state}
      className={cn(
        'relative flex aspect-square w-full max-w-xs select-none items-center justify-center',
        'mx-auto',
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        holdStartRef.current = null;
      }}
      onPointerLeave={() => {
        holdStartRef.current = null;
      }}
    >
      <svg
        viewBox="0 0 300 300"
        className="absolute inset-0 -rotate-90"
        aria-hidden
      >
        <circle
          cx="150"
          cy="150"
          r={RING_RADIUS}
          stroke="currentColor"
          strokeWidth="12"
          fill="none"
          className="text-surface-muted"
        />
        <circle
          cx="150"
          cy="150"
          r={RING_RADIUS}
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
          className={cn(
            'transition-[stroke-dashoffset] duration-1000 ease-linear',
            state === 'paused' ? 'text-warning' : 'text-primary',
          )}
          strokeDasharray={RING_CIRC}
          strokeDashoffset={dashOffset}
        />
      </svg>

      <div className="relative flex flex-col items-center text-center">
        {label && (
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-surface-fg-muted">
            {label}
          </span>
        )}
        <span
          className={cn(
            'font-mono tabular-nums leading-none',
            'text-[6rem] sm:text-[7rem] md:text-8xl',
            'font-bold',
            state === 'paused' && 'text-warning',
          )}
        >
          {formatTime(remaining)}
        </span>
        <span className="mt-2 text-xs uppercase tracking-widest text-surface-fg-subtle">
          {state === 'paused' ? 'Hold to resume' : state === 'finished' ? 'Done' : 'Hold to pause'}
        </span>
      </div>
    </div>
  );
}