/**
 * useInstallPrompt — exposes the browser's deferred PWA install prompt.
 *
 * Browsers fire `beforeinstallprompt` once the PWA is eligible (manifest
 * served + service worker registered + at least one engagement visit).
 * We capture that event, then expose a `prompt()` function so a
 * Settings "Install app" button can trigger it on demand.
 *
 * On iOS Safari, `beforeinstallprompt` doesn't fire — users have to use
 * Share → Add to Home Screen. We detect that case via
 * `isIOSSafari()` and surface it in the install hint.
 */
import { useCallback, useEffect, useState } from 'react';

export interface InstallState {
  /** True once the browser has fired beforeinstallprompt. */
  canPrompt: boolean;
  /** True if the app is already running in standalone mode. */
  isInstalled: boolean;
  /** True on iOS Safari (where beforeinstallprompt doesn't fire). */
  isIOSSafari: boolean;
  /** Trigger the install prompt; resolves to true if the user accepted. */
  prompt: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(
    window.matchMedia?.('(display-mode: standalone)').matches ||
    nav.standalone === true,
  );
}

function detectIOSSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
  // Safari only — Chrome/Firefox on iOS have their own install UI.
  const isWebkit = ua.includes('WebKit') && !ua.includes('CriOS') && !ua.includes('FxiOS');
  return isIOS && isWebkit;
}

export function useInstallPrompt(): InstallState {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsInstalled(detectStandalone());
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setDeferredEvent(null);
      setIsInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const prompt = useCallback(async () => {
    if (!deferredEvent) return 'unavailable' as const;
    try {
      await deferredEvent.prompt();
      const choice = await deferredEvent.userChoice;
      setDeferredEvent(null);
      return choice.outcome;
    } catch {
      return 'dismissed' as const;
    }
  }, [deferredEvent]);

  return {
    canPrompt: deferredEvent !== null,
    isInstalled,
    isIOSSafari: detectIOSSafari(),
    prompt,
  };
}

// Minimal type — not all TS lib.dom versions include BeforeInstallPromptEvent.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}