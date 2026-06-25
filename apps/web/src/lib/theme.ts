/**
 * Theme provider — toggles between `default` (dark) and `gym-glare` (high-contrast).
 *
 * - Manual override: localStorage 'ct:theme'
 * - Auto-detect: window.matchMedia('(prefers-contrast: more)')
 * - Source of truth: <html data-theme="...">
 *
 * Phase 1.5 T38 will wire the Settings UI toggle + ambient-light sensor API.
 */
import { useEffect, useState } from 'react';

export type ThemeName = 'default' | 'gym-glare';

const STORAGE_KEY = 'ct:theme';

function detectInitialTheme(): ThemeName {
  if (typeof window === 'undefined') return 'default';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'gym-glare' || stored === 'default') return stored;
  if (window.matchMedia?.('(prefers-contrast: more)').matches) return 'gym-glare';
  return 'default';
}

function applyTheme(name: ThemeName) {
  if (typeof document === 'undefined') return;
  if (name === 'default') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', name);
  }
}

/** Imperative API — use outside React (e.g. in event handlers). */
export function setTheme(name: ThemeName) {
  applyTheme(name);
  try {
    window.localStorage.setItem(STORAGE_KEY, name);
  } catch {
    /* localStorage blocked — ignore, theme resets on next load */
  }
}

export function getTheme(): ThemeName {
  if (typeof document === 'undefined') return 'default';
  return (document.documentElement.getAttribute('data-theme') as ThemeName) ?? 'default';
}

/** Hook for components that need to react to theme changes. */
export function useTheme(): [ThemeName, (t: ThemeName) => void] {
  const [theme, setThemeState] = useState<ThemeName>(detectInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for OS-level contrast preference changes
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-contrast: more)');
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => {
      // Only auto-switch if the user hasn't manually pinned a preference
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'gym-glare' || stored === 'default') return;
      setThemeState(e.matches ? 'gym-glare' : 'default');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return [theme, setThemeState];
}
