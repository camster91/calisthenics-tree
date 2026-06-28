import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { themeTokensPlugin } from './vite/plugin-theme.js';

// https://vite.dev/config/
// tailwindcss() MUST be listed or utility classes won't be generated (silent failure).
// themeTokensPlugin() generates src/.generated/theme.css from src/tokens.ts on dev
// server start + tokens.ts change. Single source of truth: tokens.ts.
// See react-development/references/tailwind-v4-vite-setup.md
//
// Sprint 38 hardening RED-9: bundle splitting via manualChunks. Goal:
// take the 984KB single-chunk JS down to ~400KB initial by hoisting
// vendor libraries into separate cacheable chunks. Strategy:
//   - react-vendor: react + react-dom + react-router-dom (largest, most cacheable)
//   - radix:        all @radix-ui primitives (10 packages, ~80KB total)
//   - dagre:        DAG layout (~30KB) — only loaded when TreePage renders
//   - posthog:      analytics (~70KB) — only loaded when API key is set
//   - everything else (lucide-react, i18next, etc.) stays in the app chunk
//
// Lazy-loaded routes (wireframes/*, marketing/*) get React.lazy()
// in App.tsx so they ship as their own chunks.
export default defineConfig({
  plugins: [themeTokensPlugin(), tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('@radix-ui')) return 'radix';
            if (
              id.includes('react/') ||
              id.includes('react-dom/') ||
              id.includes('react-router') ||
              id.includes('scheduler/')
            )
              return 'react-vendor';
            if (id.includes('posthog-js')) return 'posthog';
            if (id.includes('dagre')) return 'dagre';
          }
          // Wireframes (T37 dev surfaces) — separate chunk so it doesn't
          // ship to non-dev users.
          if (id.includes('/pages/wireframes/')) return 'wireframes';
          // Marketing pages (T40 / App Store screenshots) — separate chunk.
          if (id.includes('/pages/marketing/')) return 'marketing';
          return undefined; // let Rollup auto-split the rest
        },
      },
    },
    // 1MB chunk warning threshold raised from 500KB; we know about it
    // and the workbox SW will cache independently of bundle size.
    chunkSizeWarningLimit: 1500,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
