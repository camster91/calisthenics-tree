/**
 * useHaptic — vibration feedback for tap actions.
 *
 * Falls back gracefully when `navigator.vibrate` is unavailable
 * (iOS Safari, desktops, server-side rendering).
 *
 * Patterns:
 *   - 'tap'      10ms — button press, list item, rep counter increment
 *   - 'success'  [20, 60, 20] — set complete, action confirmed
 *   - 'warning'  [40, 80, 40, 80, 40] — error / regress prompt
 */
import { useCallback } from 'react';

export type HapticPattern = 'tap' | 'success' | 'warning';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  success: [20, 60, 20],
  warning: [40, 80, 40, 80, 40],
};

export function useHaptic() {
  const trigger = useCallback((pattern: HapticPattern = 'tap') => {
    if (typeof navigator === 'undefined') return;
    if (typeof navigator.vibrate !== 'function') return;
    try {
      navigator.vibrate(PATTERNS[pattern]);
    } catch {
      /* some browsers throw if called without user gesture — ignore */
    }
  }, []);
  return trigger;
}