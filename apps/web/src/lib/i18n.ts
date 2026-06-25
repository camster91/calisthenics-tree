/**
 * i18n — i18next bootstrap for Calisthenics Tree web app.
 *
 * Per PLAN.md Gap 3, English-only for v1 but scaffolded from day one so
 * new locales can drop in by adding `apps/web/src/lib/i18n/<locale>/<ns>.json`
 * and a one-line addition to `supportedLngs`.
 *
 * Detection order (browser-languagedetector):
 *   1. localStorage key `ct:lang` (so a "Language" toggle in Settings can persist)
 *   2. `navigator.language`
 *   3. Fallback: 'en'
 *
 * Namespaces are loaded eagerly so first-render trees never see untranslated
 * keys flash. Add new namespaces here AND import the JSON below — i18next
 * doesn't auto-discover.
 */
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next, useTranslation } from 'react-i18next';

import enCommon from './i18n/common/en.json';

export const SUPPORTED_LANGUAGES = ['en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const NAMESPACES = ['common'] as const;
export type Namespace = (typeof NAMESPACES)[number];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_LANGUAGES],
    ns: [...NAMESPACES],
    defaultNS: 'common',

    detection: {
      // Order matters — localStorage wins so the Settings language picker
      // can persist user intent across reloads.
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'ct:lang',
      caches: ['localStorage'],
    },

    interpolation: {
      // React already escapes by default; no need for i18next to do it.
      escapeValue: false,
    },

    // Don't surface console warnings about missing keys in dev — too noisy
    // while the translation surface is still being scaffolded. Re-enable
    // once Sprint 3 wraps up.
    saveMissing: false,
    missingKeyHandler: undefined,

    resources: {
      en: {
        common: enCommon,
      },
    },

    returnNull: false,
  });

export default i18n;

/**
 * Ergonomic re-export — most components only need the `t` function, and
 * pulling in `useTranslation` from react-i18next everywhere is verbose.
 *
 * Returns just the `t` function (no tuple, no ready flag) so call sites
 * stay short: `const t = useT();`.
 *
 * Usage:
 *   const t = useT();
 *   <button>{t('nav.settings')}</button>
 */
export function useT() {
  const { t } = useTranslation();
  return t;
}