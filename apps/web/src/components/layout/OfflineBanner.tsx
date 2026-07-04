import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * OfflineBanner — sticky banner that appears when the browser has lost
 * its network connection.
 *
 * Sprint 42 fix (UX #4): the app describes itself as "offline-first"
 * (ARCHITECTORY.md:10) but had zero offline UX before this — no
 * `navigator.onLine` check, no banner, no event listener. When the
 * network dropped mid-workout, every API call surfaced a raw error
 * and the user had no way to tell whether the app was broken or just
 * offline.
 *
 * Mounted just under the safe-area header in <Layout> so it sits
 * above the page content but doesn't push the layout. Uses
 * `role="status"` + `aria-live="polite"` so screen readers announce
 * the change without interrupting other content.
 *
 * Edge case: SSR / non-browser environments don't have
 * `navigator.onLine`. The `typeof navigator === 'undefined'` check
 * covers that; we just never render the banner there.
 */
export default function OfflineBanner() {
  // Initialise from navigator.onLine so the banner shows up on
  // page load if the browser was already offline when the user
  // opened the app.
  const [online, setOnline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-banner"
      className="border-b border-warning/30 bg-warning/15 px-5 py-2 text-center text-xs text-warning"
    >
      <span className="inline-flex items-center gap-2">
        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
        You&rsquo;re offline. Your workouts will sync when you&rsquo;re
        back online.
      </span>
    </div>
  );
}