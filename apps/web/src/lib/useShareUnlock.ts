/**
 * useShareUnlock — share a rendered unlock card via Web Share API or download.
 *
 * T39 share card integration. Resolves the PNG for a given unlockId,
 * opens the native share sheet (iOS/Android) or falls back to:
 *   1. Copying the share URL to the clipboard (desktop browsers)
 *   2. Triggering a download (last resort, e.g. browsers without Web Share)
 *
 * The PNG is fetched on-demand from `/share/<unlockId>.png` (served as a
 * static file by Vite/Caddy, produced by `scripts/render-share.ts`). The
 * URL also doubles as an Open Graph image — Slack/Twitter/iMessage fetch
 * the same URL and render it as a preview card automatically.
 */
import { useCallback, useState } from 'react';

export interface ShareUnlockInput {
  /** Unlock ID, e.g. "tuck-front-lever-001". */
  unlockId: string;
  /** Human title for the share sheet (e.g. "I just unlocked Tuck Front Lever!"). */
  title?: string;
  /** Share text body (e.g. "15 second hold — just unlocked on Calisthenics Tree."). */
  text?: string;
}

export interface ShareUnlockResult {
  share: (input: ShareUnlockInput) => Promise<void>;
  isSharing: boolean;
  error: string | null;
}

function pngUrl(unlockId: string): string {
  return `${window.location.origin}/share/${unlockId}.png`;
}

function shareUrl(unlockId: string): string {
  return `${window.location.origin}/share/${unlockId}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for non-secure contexts (HTTP localhost, etc.)
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

async function downloadPng(unlockId: string): Promise<void> {
  const res = await fetch(pngUrl(unlockId));
  if (!res.ok) throw new Error(`PNG fetch failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `calisthenics-tree-${unlockId}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useShareUnlock(): ShareUnlockResult {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const share = useCallback(async (input: ShareUnlockInput) => {
    setIsSharing(true);
    setError(null);
    try {
      const url = shareUrl(input.unlockId);
      const title = input.title ?? 'I just unlocked a new skill on Calisthenics Tree';
      const text = input.text ?? url;

      // Web Share API (iOS Safari, Android Chrome) — can attach a file directly.
      if (
        typeof navigator !== 'undefined' &&
        'share' in navigator &&
        // canShare with files is iOS Safari only — guard the cast
        typeof navigator.canShare === 'function'
      ) {
        try {
          const res = await fetch(pngUrl(input.unlockId));
          if (res.ok) {
            const blob = await res.blob();
            const file = new File([blob], `calisthenics-tree-${input.unlockId}.png`, {
              type: 'image/png',
            });
            const data = { files: [file], title, text, url };
            if (navigator.canShare(data)) {
              await navigator.share(data);
              setIsSharing(false);
              return;
            }
          }
        } catch {
          // Fall through to text-only share or download
        }

        // Text-only share (still uses the native sheet)
        if ('share' in navigator) {
          await navigator.share({ title, text, url });
          setIsSharing(false);
          return;
        }
      }

      // Desktop fallback: try clipboard, then download.
      const copied = await copyToClipboard(url);
      if (copied) {
        setIsSharing(false);
        return;
      }
      await downloadPng(input.unlockId);
      setIsSharing(false);
    } catch (err) {
      // User-cancel is not an error worth showing
      const msg = err instanceof Error ? err.message : 'Share failed';
      if (msg.toLowerCase().includes('abort')) {
        setIsSharing(false);
        return;
      }
      setError(msg);
      setIsSharing(false);
    }
  }, []);

  return { share, isSharing, error };
}

export default useShareUnlock;
